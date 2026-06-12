import { SettlementService } from '../src/services/settlement';
import { IRide } from '../src/models/Ride';

describe('SettlementService - Business Logic & Security', () => {

    // --- Settlement Tests (Tests 1-5) ---
    describe('Settlement Split Logic (Customer Cancellation)', () => {
        const dummyRide = {
            fareMicroAlgos: '10000000', // 10 GIGC
            estimatedDistanceKm: 10,
        } as IRide;

        it('Test 1 & 5: Normal Ride Completion & 90% Cancel (100% driver payout, 0 refund)', () => {
            // Cancel at 90% progress
            const distanceTravelled = 9;
            const split = SettlementService.calculateCustomerCancelSplit(dummyRide, distanceTravelled);
            expect(split.progress).toBe(0.9);
            expect(split.driverAmount).toBe(9000000);
            expect(split.customerAmount).toBe(1000000);
            
            // Cancel at >= 100% progress
            const distanceTravelledFull = 10;
            const splitFull = SettlementService.calculateCustomerCancelSplit(dummyRide, distanceTravelledFull);
            expect(splitFull.progress).toBe(1.0);
            expect(splitFull.driverAmount).toBe(10000000);
            expect(splitFull.customerAmount).toBe(0);
        });

        it('Test 2: Customer Cancellation at 20% (20% driver payout, 80% refund)', () => {
            const distanceTravelled = 2;
            const split = SettlementService.calculateCustomerCancelSplit(dummyRide, distanceTravelled);
            expect(split.progress).toBe(0.2);
            expect(split.driverAmount).toBe(2000000);
            expect(split.customerAmount).toBe(8000000);
        });

        it('Test 3: Customer Cancellation at 50%', () => {
            const distanceTravelled = 5;
            const split = SettlementService.calculateCustomerCancelSplit(dummyRide, distanceTravelled);
            expect(split.progress).toBe(0.5);
            expect(split.driverAmount).toBe(5000000);
            expect(split.customerAmount).toBe(5000000);
        });

        it('Test 4: Customer Cancellation at 70%', () => {
            const distanceTravelled = 7;
            const split = SettlementService.calculateCustomerCancelSplit(dummyRide, distanceTravelled);
            expect(split.progress).toBe(0.7);
            expect(split.driverAmount).toBe(7000000);
            expect(split.customerAmount).toBe(3000000);
        });
    });

    // --- Weather API & Multiplier Tests (Tests 14-16) ---
    describe('Weather Multiplier Logic', () => {
        beforeEach(() => {
            jest.spyOn(global, 'fetch');
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('Test 14: Clear Weather (Multiplier = 1.0)', async () => {
            (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ current: { condition: { text: 'Clear' }, precip_mm: 0 } })
            }));
            const mult = await SettlementService.getWeatherSurgeMultiplier(0, 0);
            expect(mult).toBe(1.0);
        });

        it('Test 15: Heavy Rain (Multiplier > 1.0)', async () => {
            (global.fetch as jest.Mock).mockImplementation(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ current: { condition: { text: 'heavy rain' }, precip_mm: 6 } })
            }));
            const mult = await SettlementService.getWeatherSurgeMultiplier(0, 0);
            expect(mult).toBeGreaterThan(1.0);
            expect(mult).toBe(1.8);
        });

        it('Test 16: Weather API Failure (Fallback = 1.0)', async () => {
            (global.fetch as jest.Mock).mockImplementation(() => Promise.reject(new Error('Network Error')));
            const mult = await SettlementService.getWeatherSurgeMultiplier(0, 0);
            expect(mult).toBe(1.0);
        });
    });

    // --- Security Tests (Tests 17-21) ---
    describe('Security & Trust Checks', () => {
        const ride = { rideId: 1n, status: 'Requested', fareMicroAlgos: '100' } as any;

        it('Test 17: Double Settlement Attempt Rejected', () => {
            const settledRide = { ...ride, settlementTxId: 'TX123' };
            expect(() => SettlementService.validateStateForSettlement(settledRide, 50, 50, 100))
                .toThrow('Ride already settled');
        });

        it('Test 18: Double Refund Attempt Rejected', () => {
            const refundedRide = { ...ride, status: 'CANCELLED' };
            expect(() => SettlementService.validateStateForSettlement(refundedRide, 0, 100, 100))
                .toThrow('Ride is already finalized');
        });

        it('Test 19 & 20: Negative Amounts Rejected', () => {
            expect(() => SettlementService.validateStateForSettlement(ride, -10, 110, 100))
                .toThrow('Payout amounts cannot be negative');
            expect(() => SettlementService.validateStateForSettlement(ride, 110, -10, 100))
                .toThrow('Payout amounts cannot be negative');
        });

        it('Test 21: Total Payout Greater Than Escrow Rejected', () => {
            expect(() => SettlementService.validateStateForSettlement(ride, 60, 50, 100))
                .toThrow('exceeds escrowed fare');
        });
    });

    // --- Receipt Tests (Tests 22-24, 33) ---
    describe('Receipt Integrity and Hashing', () => {
        const mockRide = {
            rideId: '123',
            customer: 'CUST_ADDRESS',
            rider: 'DRIVER_ADDRESS',
            fareMicroAlgos: '1000',
        } as any;

        it('Test 22: Ride Completion Receipt Generation', () => {
            const { receipt, hash } = SettlementService.generateReceiptHash(mockRide, 800, 200, 0, 0, 1.0, 'RIDE_COMPLETED');
            expect(receipt).toBeDefined();
            expect(hash).toBeDefined();
            expect(receipt.settlementReason).toBe('RIDE_COMPLETED');
            expect(receipt.driverPayout).toBe('800');
        });

        it('Test 23 & 33: Hash Verification & Tampering Detection', () => {
            const { receipt, hash } = SettlementService.generateReceiptHash(mockRide, 800, 200, 0, 0, 1.0, 'RIDE_COMPLETED');
            
            // Recompute manually
            const crypto = require('crypto');
            const validHash = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
            expect(hash).toBe(validHash);

            // Tamper receipt
            const tamperedReceipt = { ...receipt, driverPayout: '1000' };
            const tamperedHash = crypto.createHash('sha256').update(JSON.stringify(tamperedReceipt)).digest('hex');
            
            expect(hash).not.toBe(tamperedHash);
        });

        it('Test 24: Settlement Reason Validation', () => {
            const reasons = [
                'RIDE_COMPLETED', 'CUSTOMER_CANCELLED', 'DRIVER_CANCELLED', 
                'CUSTOMER_NO_SHOW', 'DRIVER_NO_SHOW', 'DISPUTE_PENDING', 
                'DISPUTE_AUTO_REFUND', 'TIMEOUT_RECOVERY'
            ];

            for (const reason of reasons) {
                const { receipt } = SettlementService.generateReceiptHash(mockRide, 0, 0, 0, 0, 1.0, reason);
                expect(receipt.settlementReason).toBe(reason);
            }
        });
    });
});
