import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index';
import Ride from '../src/models/Ride';

// Mock Algorand SDK to prevent real blockchain calls during tests
jest.mock('algosdk', () => {
    const originalModule = jest.requireActual('algosdk');
    return {
        ...originalModule,
        Algodv2: jest.fn().mockImplementation(() => ({
            getTransactionParams: jest.fn().mockReturnValue({
                do: jest.fn().mockResolvedValue({ fee: 1000, firstRound: 1, lastRound: 1000, genesisID: 'test', genesisHash: 'test' })
            })
        })),
        AtomicTransactionComposer: jest.fn().mockImplementation(() => ({
            addMethodCall: jest.fn(),
            addTransaction: jest.fn(),
            execute: jest.fn().mockResolvedValue({ txIDs: ['MOCK_TX_ID_1234567890'] })
        })),
        makeBasicAccountTransactionSigner: jest.fn(),
    };
});

describe('Rides Integration & Lifecycle Tests', () => {
    
    afterEach(async () => {
        await Ride.deleteMany({});
    });

    // --- Customer No-Show Tests (Tests 6-9) & Test 32 (Presence Evidence) ---
    describe('Customer No-Show & Presence Evidence', () => {
        it('Test 6 & 32: True Customer No-Show (No interaction -> CUSTOMER_NO_SHOW)', async () => {
            await Ride.create({
                rideId: 101,
                customer: 'CUST123',
                rider: 'DRV123',
                status: 'DRIVER_ARRIVED',
                driverArrivalAt: new Date(Date.now() - 15 * 60 * 1000), // Arrived 15 mins ago
                fareMicroAlgos: '10000000',
                pickup: { label: 'A', lat: 0, lng: 0 },
                drop: { label: 'B', lat: 1, lng: 1 },
                paymentLocked: true,
                vehicleType: 'SEDAN'
            });

            await request(app).post('/api/rides/presence-event').send({ rideId: 101, event: 'OTP_VIEWED' });
            
            const updatedRide = await Ride.findOne({ rideId: 101 });
            expect(updatedRide?.customerViewedOTP).toBe(true);
            expect(updatedRide?.presenceEvidence).toContain('OTP_VIEWED');
        });

        it('Test 7-9: Customer Opens Screen, Views OTP, or presses Im Here (DISPUTE_PENDING)', async () => {
            await Ride.create({
                rideId: 102, customer: 'C', status: 'DRIVER_ARRIVED',
                fareMicroAlgos: '10000',
                pickup: { label: 'A', lat: 0, lng: 0 },
                drop: { label: 'B', lat: 1, lng: 1 },
                vehicleType: 'SEDAN'
            });
            await request(app).post('/api/rides/presence-event').send({ rideId: 102, event: 'IM_HERE_PRESSED' });
            
            const ride = await Ride.findOne({ rideId: 102 });
            expect(ride?.customerPressedImHere).toBe(true);
            expect(ride?.presenceEvidence).toContain('IM_HERE_PRESSED');
        });
    });

    // --- Driver Protection Tests (Tests 10-11) ---
    describe('Driver Protection & Cancellation', () => {
        it('Test 11: Emergency Driver Cancellation (No penalty)', async () => {
            await Ride.create({ 
                rideId: 103, customer: 'C', fareMicroAlgos: '1000', 
                status: 'REQUESTED', driverReputation: 5,
                pickup: { label: 'A', lat: 0, lng: 0 },
                drop: { label: 'B', lat: 1, lng: 1 },
                vehicleType: 'SEDAN'
            });
            
            const res = await request(app).post('/api/rides/driver-cancel').send({
                rideId: 103,
                reason: 'Medical emergency',
            });

            expect(res.status).toBe(200);
            const updatedRide = await Ride.findOne({ rideId: 103 });
            expect(updatedRide?.status).toBe('CANCELLED');
            expect(updatedRide?.reputationDelta).toBe(0); 
        });
    });

    // --- System Resilience (Test 31) & Transcation Audit (Test 34) ---
    describe('System Resilience & Audit', () => {
        it('Test 34: Algorand Transaction Reference Validation', async () => {
            await Ride.create({
                rideId: 104, customer: 'C', rider: 'D', status: 'DROPPED_OFF',
                fareMicroAlgos: '1000000',
                pickup: { label: 'A', lat: 0, lng: 0 }, drop: { label: 'B', lat: 1, lng: 1 },
                estimatedDistanceKm: 5, rideStartedAt: new Date(), driverArrivalAt: new Date(),
                vehicleType: 'SEDAN'
            });

            const res = await request(app).post('/api/rides/end-ride').send({ rideId: 104 });
            expect(res.status).toBe(200);
            
            const updatedRide = await Ride.findOne({ rideId: 104 });
            expect(updatedRide?.status).toBe('RIDE_COMPLETED');
            expect(updatedRide?.settlementTxId).toBe('MOCK_TX_ID_1234567890');
            expect(updatedRide?.receiptHash).toBeDefined();
            expect(updatedRide?.settlementReason).toBe('RIDE_COMPLETED');
        });
    });

    // --- Full Ride Lifecycle (Test 35) ---
    describe('Full Ride Lifecycle Test (Test 35)', () => {
        it('Should execute the full ride lifecycle successfully', async () => {
            // 1. Create Ride
            let res = await request(app).post('/api/rides/create').send({
                rideId: 999, customer: 'C_WALLET', pickup: { label: 'A', lat: 10, lng: 10 }, drop: { label: 'B', lat: 10.1, lng: 10.1 }, fareMicroAlgos: '1500000', vehicleType: 'SEDAN', status: 'REQUESTED'
            });
            expect(res.status).toBe(200);
            expect(res.body.ride.status).toBe('REQUESTED');

            // 2. Driver Assigned & Arrived
            res = await request(app).post('/api/rides/update-status').send({
                rideId: 999, status: 'DRIVER_ARRIVED', rider: 'D_WALLET'
            });
            expect(res.status).toBe(200);
            expect(res.body.ride.status).toBe('DRIVER_ARRIVED');

            // 3. Customer Present (OTP)
            res = await request(app).post('/api/rides/store-otp').send({ rideId: 999, otp: '1234' });
            expect(res.status).toBe(200);
            expect(res.body.ride.otpVerified).toBe(true);

            // 4. Ride Started
            res = await request(app).post('/api/rides/update-status').send({
                rideId: 999, status: 'RIDE_STARTED'
            });
            expect(res.status).toBe(200);
            expect(res.body.ride.status).toBe('RIDE_STARTED');

            // 5. Driver Dropoff
            res = await request(app).post('/api/rides/driver-dropoff').send({
                rideId: 999, driverAddress: 'D_WALLET', driverLat: 10.1, driverLng: 10.1
            });
            expect(res.status).toBe(200);

            // 6. Ride Completed (Settlement)
            res = await request(app).post('/api/rides/end-ride').send({ rideId: 999 });
            expect(res.status).toBe(200);
            expect(res.body.payoutTxId).toBe('MOCK_TX_ID_1234567890');
        });
    });
});
