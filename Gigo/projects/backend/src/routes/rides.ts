import express from 'express';
import Ride from '../models/Ride';
import algosdk from 'algosdk';
import { ABIMethod } from 'algosdk';
import { SettlementService } from '../services/settlement';
import { SettlementAudit } from '../models/SettlementAudit';
import { Customer } from '../models/Customer';
import { getRouteOptions, getTrafficCondition } from '../services/routeService';

const router = express.Router();

const ALGORAND_NODE = process.env.ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || '';
const APP_ID = Number(process.env.RIDE_APP_ID || '764183368');
const GIGC_ASSET_ID = Number(process.env.GIGC_ASSET_ID || '763011769');

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBoxKey(prefix: string, rideId: bigint): Uint8Array {
  const prefixBytes = Buffer.from(prefix);
  const rideIdBytes = Buffer.alloc(8);
  rideIdBytes.writeBigUInt64BE(rideId);
  return new Uint8Array(Buffer.concat([prefixBytes, rideIdBytes]));
}

function updateReputation(currentRep: number | undefined, delta: number): number {
  let rep = currentRep !== undefined ? currentRep : 5; // Start at 5
  rep += delta;
  return Math.max(0, Math.min(rep, 5)); // Cap between 0 and 5
}

router.get('/', async (req, res) => {
  try {
    const rides = await Ride.find().sort({ createdAt: -1 }).limit(100);
    res.json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

router.get('/estimate-surge', async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng } = req.query;
    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    const pLat = parseFloat(pickupLat as string);
    const pLng = parseFloat(pickupLng as string);
    const dLat = parseFloat(dropLat as string);
    const dLng = parseFloat(dropLng as string);

    const weatherMultiplier = await SettlementService.getWeatherSurgeMultiplier(pLat, pLng);
    
    const routeOptions = await getRouteOptions(pLat, pLng, dLat, dLng);
    const trafficCondition = getTrafficCondition(routeOptions);
    
    let trafficMultiplier = 1.0;
    if (trafficCondition === 'HEAVY') trafficMultiplier = 1.5;
    else if (trafficCondition === 'MODERATE') trafficMultiplier = 1.2;

    res.json({
      weatherMultiplier,
      trafficMultiplier,
      trafficCondition
    });
  } catch (error) {
    console.error('Estimate surge error:', error);
    res.status(500).json({ error: 'Failed to estimate surge' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { rideId, customer, pickup, drop, fareMicroAlgos, vehicleType, status, paymentLocked, isSurge } = req.body;
    
    // Estimate distance on creation
    const estimatedDistanceKm = haversineKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    const weatherMultiplier = await SettlementService.getWeatherSurgeMultiplier(pickup.lat, pickup.lng);

    const ride = await Ride.findOneAndUpdate(
      { rideId },
      { 
        customer, pickup, drop, fareMicroAlgos, vehicleType, 
        status: status || 'Requested', 
        paymentLocked: paymentLocked !== undefined ? paymentLocked : true,
        estimatedDistanceKm,
        weatherMultiplier,
        isSurge: isSurge || false,
        escrowCreatedAt: new Date()
      },
      { returnDocument: 'after', upsert: true }
    );
    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ride' });
  }
});

router.post('/update-status', async (req, res) => {
  try {
    const { rideId, status, rider, paymentLocked } = req.body;
    const updateData: any = { status, lastStateUpdate: new Date() };
    if (rider !== undefined) updateData.rider = rider;
    if (paymentLocked !== undefined) updateData.paymentLocked = paymentLocked;
    
    if (status === 'RIDE_STARTED') {
      updateData.rideStartedAt = new Date();
      const existingRide = await Ride.findOne({ rideId });
      if (existingRide && existingRide.driverArrivalAt) {
        updateData.waitTimeFee = SettlementService.calculateWaitTimeFee(existingRide.driverArrivalAt, updateData.rideStartedAt).toString();
      }
    }
    
    // Driver reaches pickup (marks arrival)
    if (status === 'DRIVER_ARRIVED') updateData.driverArrivalAt = new Date();

    const ride = await Ride.findOneAndUpdate(
      { rideId },
      updateData,
      { returnDocument: 'after' }
    );
    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

router.post('/store-otp', async (req, res) => {
  try {
    const { rideId, otp } = req.body;
    const ride = await Ride.findOneAndUpdate(
      { rideId },
      { otp, otpVerified: true },
      { returnDocument: 'after' }
    );
    res.json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store OTP' });
  }
});

router.post('/clear', async (req, res) => {
  try {
    const { customer } = req.body;
    if (customer) {
      await Ride.deleteMany({ customer });
    } else {
      await Ride.deleteMany({});
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear rides' });
  }
});

router.post('/customer-cancel', async (req, res) => {
  try {
    const { rideId, currentLat, currentLng } = req.body;
    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    
    const totalFare = parseInt(ride.fareMicroAlgos, 10);
    
    let customerAmount = 0;
    let driverAmount = 0;

    if (ride.status === 'DRIVER_ARRIVED') {
      customerAmount = 0;
      driverAmount = totalFare;
    } else if (ride.status === 'RIDE_STARTED' && currentLat != null && currentLng != null) {
      const distanceTravelled = haversineKm(ride.pickup.lat, ride.pickup.lng, currentLat, currentLng);
      const split = SettlementService.calculateCustomerCancelSplit(ride, distanceTravelled);
      customerAmount = split.customerAmount;
      driverAmount = split.driverAmount;
    } else {
      customerAmount = totalFare;
      driverAmount = 0;
    }

    SettlementService.validateStateForSettlement(ride, driverAmount, customerAmount, totalFare);

    if (!TREASURY_MNEMONIC) return res.status(500).json({ error: 'Treasury wallet not configured' });

    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    const refundMethodSig = 'cancel_refund(uint64,uint64,uint64,string)void';
    const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());
    
    const { hash } = SettlementService.generateReceiptHash(ride, driverAmount, customerAmount, 0, 0, 1.0, 'CUSTOMER_CANCELLED');

    const atc = new algosdk.AtomicTransactionComposer();
    const appAccounts = [ride.customer];
    if (ride.rider && driverAmount > 0) appAccounts.push(ride.rider);
    
    atc.addMethodCall({
      appID: APP_ID,
      method: abiMethod,
      methodArgs: [BigInt(rideId), BigInt(customerAmount), BigInt(driverAmount), hash],
      sender: treasuryAccount.addr,
      suggestedParams: { ...suggestedParams, fee: 4000, flatFee: true },
      signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
      boxes: [
        { appIndex: APP_ID, name: getBoxKey('c_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('f_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('d_', BigInt(rideId)) }
      ],
      appAccounts,
      appForeignAssets: [GIGC_ASSET_ID]
    });

    let result;
    try {
      result = await atc.execute(algodClient, 4);
    } catch (atcError: any) {
      if (atcError.message && atcError.message.includes('pc=508')) {
        console.log(`[customer-cancel] Escrow missing for ride ${rideId}. Syncing DB...`);
        await Ride.findOneAndDelete({ rideId });
        return res.json({ success: true, message: 'Ride already settled on chain.', customerAmount, driverAmount, receiptHash: hash });
      }
      throw atcError;
    }
    
    await SettlementAudit.create({
      rideId,
      driverPayout: driverAmount.toString(),
      customerRefund: customerAmount.toString(),
      settlementReason: 'CUSTOMER_CANCELLED',
      receiptHash: hash,
      algorandTxId: result.txIDs[0]
    });
    
    await Ride.findOneAndUpdate(
      { rideId },
      { 
        status: 'CANCELLED', paymentLocked: false, settlementTxId: result.txIDs[0], receiptHash: hash,
        cancellationReason: 'Customer Cancellation', settlementReason: 'CUSTOMER_CANCELLED'
      }
    );

    res.json({ success: true, txId: result.txIDs[0], customerAmount, driverAmount, receiptHash: hash });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/driver-cancel', async (req, res) => {
  try {
    const { rideId, reason, currentLat, currentLng } = req.body;
    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    
    const totalFare = parseInt(ride.fareMicroAlgos, 10);
    
    let customerAmount = 0;
    let driverAmount = 0;

    if (ride.status === 'RIDE_STARTED' && currentLat != null && currentLng != null) {
      const distanceTravelled = haversineKm(ride.pickup.lat, ride.pickup.lng, currentLat, currentLng);
      const split = SettlementService.calculateCustomerCancelSplit(ride, distanceTravelled);
      customerAmount = split.customerAmount;
      driverAmount = split.driverAmount;
    } else {
      customerAmount = totalFare;
      driverAmount = 0;
    }

    SettlementService.validateStateForSettlement(ride, driverAmount, customerAmount, totalFare);

    if (!TREASURY_MNEMONIC) return res.status(500).json({ error: 'Treasury wallet not configured' });

    // Reputation Logic
    let repDelta = 0;
    const isEmergency = ["emergency", "medical", "accident", "traffic", "weather"].some(w => reason?.toLowerCase().includes(w));
    if (!isEmergency) {
      repDelta = -5; // Penalty for repeated cancel or non-emergency
    }

    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    const refundMethodSig = 'cancel_refund(uint64,uint64,uint64,string)void';
    const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());
    
    const { hash } = SettlementService.generateReceiptHash(ride, driverAmount, customerAmount, 0, 0, 1.0, 'DRIVER_CANCELLED');

    const atc = new algosdk.AtomicTransactionComposer();
    const appAccounts = [ride.customer];
    if (ride.rider && driverAmount > 0) appAccounts.push(ride.rider);

    atc.addMethodCall({
      appID: APP_ID,
      method: abiMethod,
      methodArgs: [BigInt(rideId), BigInt(customerAmount), BigInt(driverAmount), hash],
      sender: treasuryAccount.addr,
      suggestedParams: { ...suggestedParams, fee: 4000, flatFee: true },
      signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
      boxes: [
        { appIndex: APP_ID, name: getBoxKey('c_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('f_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('d_', BigInt(rideId)) }
      ],
      appAccounts,
      appForeignAssets: [GIGC_ASSET_ID]
    });

    const result = await atc.execute(algodClient, 4);
    
    await SettlementAudit.create({
      rideId,
      driverPayout: driverAmount.toString(),
      customerRefund: customerAmount.toString(),
      settlementReason: 'DRIVER_CANCELLED',
      receiptHash: hash,
      algorandTxId: result.txIDs[0]
    });
    
    await Ride.findOneAndUpdate(
      { rideId },
      { 
        status: 'CANCELLED', paymentLocked: false, settlementTxId: result.txIDs[0], 
        cancellationReason: reason, receiptHash: hash,
        settlementReason: 'DRIVER_CANCELLED',
        driverReputation: updateReputation(ride.driverReputation, repDelta),
        reputationReason: reason,
        reputationDelta: repDelta
      }
    );

    res.json({ success: true, txId: result.txIDs[0], customerAmount, driverAmount, receiptHash: hash });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customer-no-show', async (req, res) => {
  try {
    const { rideId } = req.body;
    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'DRIVER_ARRIVED') return res.status(400).json({ error: 'Driver has not arrived yet' });

    if (!ride.driverArrivalAt) {
      return res.status(400).json({ error: 'Arrival time not recorded' });
    }

    const arrivalTime = new Date(ride.driverArrivalAt).getTime();
    const waitTimeMinutes = (Date.now() - arrivalTime) / 60000;
    
    // Validate driver waited at least 10 minutes
    if (waitTimeMinutes < 10) {
      return res.status(400).json({ error: `Must wait 10 minutes. Waited ${Math.floor(waitTimeMinutes)} minutes.` });
    }

    const totalFare = parseInt(ride.fareMicroAlgos, 10);
    // Give 100% of the fare to the driver for their wasted time
    const driverAmount = totalFare;
    const customerAmount = 0;

    SettlementService.validateStateForSettlement(ride, driverAmount, customerAmount, totalFare);
    if (!TREASURY_MNEMONIC) return res.status(500).json({ error: 'Treasury wallet not configured' });

    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    const refundMethodSig = 'cancel_refund(uint64,uint64,uint64,string)void';
    const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());
    
    const { hash } = SettlementService.generateReceiptHash(ride, driverAmount, customerAmount, 0, 0, 1.0, 'CUSTOMER_NO_SHOW');

    const atc = new algosdk.AtomicTransactionComposer();
    const appAccounts = [ride.customer];
    if (ride.rider) appAccounts.push(ride.rider);
    
    atc.addMethodCall({
      appID: APP_ID,
      method: abiMethod,
      methodArgs: [BigInt(rideId), BigInt(customerAmount), BigInt(driverAmount), hash],
      sender: treasuryAccount.addr,
      suggestedParams: { ...suggestedParams, fee: 4000, flatFee: true },
      signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
      boxes: [
        { appIndex: APP_ID, name: getBoxKey('c_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('f_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('d_', BigInt(rideId)) }
      ],
      appAccounts,
      appForeignAssets: [GIGC_ASSET_ID]
    });

    let result;
    try {
      result = await atc.execute(algodClient, 4);
    } catch (atcError: any) {
      if (atcError.message && atcError.message.includes('pc=508')) {
        await Ride.findOneAndDelete({ rideId });
        return res.json({ success: true, message: 'Ride already settled on chain.' });
      }
      throw atcError;
    }
    
    await SettlementAudit.create({
      rideId,
      driverPayout: driverAmount.toString(),
      customerRefund: customerAmount.toString(),
      settlementReason: 'CUSTOMER_NO_SHOW',
      receiptHash: hash,
      algorandTxId: result.txIDs[0]
    });
    
    await Ride.findOneAndUpdate(
      { rideId },
      { 
        status: 'CANCELLED', paymentLocked: false, settlementTxId: result.txIDs[0], receiptHash: hash,
        cancellationReason: 'Customer No-Show', settlementReason: 'CUSTOMER_NO_SHOW'
      }
    );

    res.json({ success: true, txId: result.txIDs[0], customerAmount, driverAmount, receiptHash: hash });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/dispute-cleanup', async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    // Find rides stuck in RIDER_ASSIGNED for > 1 hour
    const stuckRides = await Ride.find({
      status: 'RIDER_ASSIGNED',
      createdAt: { $lt: oneHourAgo },
      paymentLocked: true
    });

    const results = [];
    if (!TREASURY_MNEMONIC) return res.status(500).json({ error: 'Treasury wallet not configured' });
    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const refundMethodSig = 'cancel_refund(uint64,uint64,uint64,string)void';
    const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());

    for (const ride of stuckRides) {
      try {
        const totalFare = parseInt(ride.fareMicroAlgos, 10);
        const customerAmount = totalFare;
        const driverAmount = 0;

        const suggestedParams = await algodClient.getTransactionParams().do();
        const { hash } = SettlementService.generateReceiptHash(ride, driverAmount, customerAmount, 0, 0, 1.0, 'DRIVER_NO_SHOW_TIMEOUT');

        const atc = new algosdk.AtomicTransactionComposer();
        const appAccounts = [ride.customer];
        if (ride.rider) appAccounts.push(ride.rider);
        
        atc.addMethodCall({
          appID: APP_ID,
          method: abiMethod,
          methodArgs: [BigInt(ride.rideId), BigInt(customerAmount), BigInt(driverAmount), hash],
          sender: treasuryAccount.addr,
          suggestedParams: { ...suggestedParams, fee: 4000, flatFee: true },
          signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
          boxes: [
            { appIndex: APP_ID, name: getBoxKey('c_', BigInt(ride.rideId)) },
            { appIndex: APP_ID, name: getBoxKey('f_', BigInt(ride.rideId)) },
            { appIndex: APP_ID, name: getBoxKey('d_', BigInt(ride.rideId)) }
          ],
          appAccounts,
          appForeignAssets: [GIGC_ASSET_ID]
        });

        const result = await atc.execute(algodClient, 4);

        await SettlementAudit.create({
          rideId: ride.rideId,
          driverPayout: driverAmount.toString(),
          customerRefund: customerAmount.toString(),
          settlementReason: 'DRIVER_NO_SHOW_TIMEOUT',
          receiptHash: hash,
          algorandTxId: result.txIDs[0]
        });
        
        await Ride.findOneAndUpdate(
          { rideId: ride.rideId },
          { 
            status: 'CANCELLED', paymentLocked: false, settlementTxId: result.txIDs[0], receiptHash: hash,
            cancellationReason: 'Driver No-Show Timeout', settlementReason: 'DRIVER_NO_SHOW_TIMEOUT'
          }
        );
        results.push({ rideId: ride.rideId, status: 'success' });
      } catch (err: any) {
        if (err.message && err.message.includes('pc=508')) {
          await Ride.findOneAndDelete({ rideId: ride.rideId });
        }
        results.push({ rideId: ride.rideId, status: 'error', error: err.message });
      }
    }
    
    res.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/driver-dropoff', async (req, res) => {
  try {
    const { rideId, driverAddress, driverLat, driverLng } = req.body;

    if (!rideId || !driverAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'RIDE_STARTED') return res.status(400).json({ error: `Cannot drop off in status: ${ride.status}` });

    // Mark ride as dropped off, pending customer confirmation
    await Ride.findOneAndUpdate(
      { rideId },
      { status: 'DROPPED_OFF' }
    );

    res.json({ success: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to drop off' });
  }
});

router.post('/end-ride', async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'DROPPED_OFF') return res.status(400).json({ error: `Cannot release payment in status: ${ride.status}` });

    // Distance constraint removed for demo/testing purposes.

    if (!TREASURY_MNEMONIC) return res.json({ success: true, payoutSkipped: true, reason: 'Treasury wallet not configured' });

    // Payout Calculation
    const weatherMultiplier = await SettlementService.getWeatherSurgeMultiplier(ride.pickup.lat, ride.pickup.lng);
    const totalFare = parseInt(ride.fareMicroAlgos, 10);
    const waitTimeFee = SettlementService.calculateWaitTimeFee(ride.driverArrivalAt, ride.rideStartedAt);
    
    const actualDurationMs = Date.now() - new Date(ride.rideStartedAt!).getTime();
    const estDurationMs = (ride.estimatedDistanceKm || 0) * 3 * 60000;
    const trafficDelayFee = SettlementService.calculateTrafficDelayFee(estDurationMs, actualDurationMs); 
    
    // Note: totalFare already includes weather and traffic multipliers calculated at booking.
    let idealDriverAmount = totalFare + waitTimeFee + trafficDelayFee;
    let escrowDriverAmount = idealDriverAmount > totalFare ? totalFare : idealDriverAmount;
    let customerAmount = totalFare - escrowDriverAmount;
    let subsidyAmount = idealDriverAmount > totalFare ? idealDriverAmount - totalFare : 0;

    SettlementService.validateStateForSettlement(ride, escrowDriverAmount, customerAmount, totalFare);

    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    const payoutMethodSig = 'release_payment(uint64,address,uint64,uint64,string)void';
    const abiMethod = new ABIMethod(ABIMethod.fromSignature(payoutMethodSig).toJSON());

    const { hash } = SettlementService.generateReceiptHash(ride, idealDriverAmount, customerAmount, waitTimeFee, trafficDelayFee, weatherMultiplier, 'RIDE_COMPLETED', ride.presenceEvidence);

    const atc = new algosdk.AtomicTransactionComposer();
    atc.addMethodCall({
      appID: APP_ID,
      method: abiMethod,
      methodArgs: [BigInt(rideId), ride.rider, BigInt(escrowDriverAmount), BigInt(customerAmount), hash],
      sender: treasuryAccount.addr,
      suggestedParams: { ...suggestedParams, fee: 4000, flatFee: true },
      signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
      boxes: [
        { appIndex: APP_ID, name: getBoxKey('c_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('f_', BigInt(rideId)) },
        { appIndex: APP_ID, name: getBoxKey('d_', BigInt(rideId)) }
      ],
      appAccounts: [ride.rider, ride.customer],
      appForeignAssets: [GIGC_ASSET_ID]
    });

    if (subsidyAmount > 0) {
      const subsidyTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: treasuryAccount.addr,
        to: ride.rider,
        amount: subsidyAmount,
        assetIndex: GIGC_ASSET_ID,
        suggestedParams
      });
      atc.addTransaction({ txn: subsidyTxn, signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount) });
    }

     let txId = 'ALREADY_SETTLED';
    try {
      await algodClient.getApplicationBoxByName(APP_ID, getBoxKey('c_', BigInt(rideId))).do();
      const result = await atc.execute(algodClient, 4);
      txId = result.txIDs[0];
      
      // Track debt for customer if treasury subsidized the ride
      if (subsidyAmount > 0) {
        await Customer.findOneAndUpdate(
          { walletAddress: ride.rider.toLowerCase() },
          { $inc: { outstandingDebt: subsidyAmount } },
          { upsert: true, new: true }
        );
      }
    } catch (e: any) {
      if (e?.response?.status === 404 || (e.message && e.message.includes('box not found'))) {
        console.log(`Escrow box for ride ${rideId} not found. Likely already processed on-chain.`);
      } else {
        throw e;
      }
    }

    await SettlementAudit.create({
      rideId,
      driverPayout: idealDriverAmount.toString(),
      customerRefund: customerAmount.toString(),
      settlementReason: 'RIDE_COMPLETED',
      receiptHash: hash,
      algorandTxId: txId
    });
    
    await Ride.findOneAndUpdate(
      { rideId },
      { 
        status: 'RIDE_COMPLETED', paymentLocked: false, settlementTxId: txId, receiptHash: hash,
        settlementReason: 'RIDE_COMPLETED',
        driverReputation: updateReputation(ride.driverReputation, +5), // +5 for completed ride
        reputationReason: 'Completed ride safely',
        reputationDelta: 5,
        waitTimeFee: waitTimeFee.toString(),
        weatherMultiplier,
        trafficDelayFee: trafficDelayFee.toString()
      }
    );

    res.json({ success: true, payoutTxId: txId, receiptHash: hash });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to end ride' });
  }
});

router.post('/check-timeout', async (req, res) => {
  try {
    const { rideId } = req.body;
    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.json({ error: 'Ride not found' });
    
    if (ride.status === 'CANCELLED' || ride.status === 'RIDE_COMPLETED') {
       return res.json({ timedOut: true, refunded: true, refundTxId: ride.settlementTxId });
    }
    
    if (ride.status === 'RIDE_STARTED' && ride.rideStartedAt) {
      const distanceKm = haversineKm(ride.pickup.lat, ride.pickup.lng, ride.drop.lat, ride.drop.lng);
      const maxAllowedMins = Math.ceil((distanceKm * 3) + (distanceKm * 1));
      const elapsedMins = (Date.now() - new Date(ride.rideStartedAt).getTime()) / 60000;
      const remaining = maxAllowedMins - elapsedMins;
      
      if (remaining <= 0) {
        // Automatically refund the customer 100% because the driver timed out
        try {
          const totalFare = parseInt(ride.fareMicroAlgos, 10);
          await executeAutomaticSettlement(ride, totalFare, 0, 'DRIVER_TIMEOUT');
          // Fetch the updated ride to get the tx id
          const updatedRide = await Ride.findOne({ rideId });
          return res.json({ timedOut: true, refunded: true, refundTxId: updatedRide?.settlementTxId });
        } catch (settleErr: any) {
          return res.json({ timedOut: true, refunded: false, error: settleErr.message });
        }
      }

      return res.json({ timedOut: false, minutesRemaining: remaining > 0 ? remaining : 0 });
    }
    
    res.json({ timedOut: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/presence-event', async (req, res) => {
  try {
    const { rideId, event } = req.body;
    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    
    let update: any = { $addToSet: { presenceEvidence: event } };
    const now = new Date();
    
    if (event === 'RIDE_SCREEN_OPENED') { update.customerOpenedRideScreen = true; update.rideScreenOpenedAt = now; }
    if (event === 'OTP_VIEWED') { update.customerViewedOTP = true; update.otpViewedAt = now; }
    if (event === 'IM_HERE_PRESSED') { update.customerPressedImHere = true; update.imHerePressedAt = now; }
    if (event === 'PICKUP_INTERACTION') { update.customerPickupInteraction = true; update.pickupInteractionAt = now; }
    
    await Ride.updateOne({ rideId }, update);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Background Auto-Scanner for Protections
async function performAutomaticTimeoutScan() {
  try {
    const activeRides = await Ride.find({ status: { $in: ['Requested', 'DRIVER_ARRIVED', 'DISPUTE_PENDING'] } });
    if (!activeRides || activeRides.length === 0) return;

    for (const ride of activeRides) {
      // 1. Escrow Timeout Recovery (> 24 hours unresolved, here we use 1 hour for testnet purposes if escrowCreatedAt > 1h)
      if (ride.escrowCreatedAt && ride.status !== 'DISPUTE_PENDING') {
        const escrowAgeMins = (Date.now() - new Date(ride.escrowCreatedAt).getTime()) / 60000;
        if (escrowAgeMins >= 60) {
          console.log(`⏰ [Auto-Scanner] Ride ${ride.rideId} abandoned for >1h. Escrow Recovery...`);
          await executeAutomaticSettlement(ride, parseInt(ride.fareMicroAlgos, 10), 0, 'TIMEOUT_RECOVERY');
          continue;
        }
      }

      // 2. Driver No-Show Protection
      if (ride.status === 'Requested' && ride.rider && ride.lastStateUpdate) {
        const idleMins = (Date.now() - new Date(ride.lastStateUpdate).getTime()) / 60000;
        if (idleMins >= 15) { // 15 mins timeout for driver to arrive
          console.log(`⏰ [Auto-Scanner] Driver No-Show for ${ride.rideId}`);
          await Ride.findOneAndUpdate({ rideId: ride.rideId }, { 
            driverReputation: updateReputation(ride.driverReputation, -5),
            reputationReason: 'Driver No-Show',
            reputationDelta: -5
          });
          await executeAutomaticSettlement(ride, parseInt(ride.fareMicroAlgos, 10), 0, 'DRIVER_NO_SHOW');
          continue;
        }
      }

      // 3. New Customer No-Show vs Dispute logic
      if (ride.status === 'DRIVER_ARRIVED' && ride.driverArrivalAt && !ride.otpVerified) {
        const waitMins = (Date.now() - new Date(ride.driverArrivalAt).getTime()) / 60000;
        if (waitMins >= 10) { // 10 mins threshold
          const customerPresent = ride.customerOpenedRideScreen || ride.customerViewedOTP || ride.customerPressedImHere || ride.customerPickupInteraction;
          
          if (!customerPresent) {
            console.log(`⏰ [Auto-Scanner] True Customer No-Show for ${ride.rideId}`);
            const totalFare = parseInt(ride.fareMicroAlgos, 10);
            const driverCompensation = 5 * 1000000; // 5 GIGC
            let driverAmt = driverCompensation > totalFare ? totalFare : driverCompensation;
            let customerAmt = totalFare - driverAmt;
            await executeAutomaticSettlement(ride, customerAmt, driverAmt, 'CUSTOMER_NO_SHOW');
          } else {
            console.log(`⚠️ [Auto-Scanner] Dispute Pending for ${ride.rideId}. Customer present but ride not started.`);
            await Ride.findOneAndUpdate({ rideId: ride.rideId }, { status: 'DISPUTE_PENDING', lastStateUpdate: new Date() });
          }
          continue;
        }
      }
      
      // 4. Dispute Pending 24-hour timeout (using 2 mins for testnet)
      if (ride.status === 'DISPUTE_PENDING' && ride.lastStateUpdate) {
          const disputeAgeMins = (Date.now() - new Date(ride.lastStateUpdate).getTime()) / 60000;
          if (disputeAgeMins >= 1440) { // 24 hours in production, but let's use 60 mins for testnet safety
             console.log(`⏰ [Auto-Scanner] Auto Refund for unresolved Dispute ${ride.rideId}`);
             await executeAutomaticSettlement(ride, parseInt(ride.fareMicroAlgos, 10), 0, 'DISPUTE_AUTO_REFUND');
             continue;
          }
      }
    }
  } catch (err) {
    console.error('❌ [Auto-Scanner] Error:', err);
  }
}

async function executeAutomaticSettlement(ride: any, customerAmount: number, driverAmount: number, reason: string) {
  if (!TREASURY_MNEMONIC) return;
  try {
    const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
    const suggestedParams = await algodClient.getTransactionParams().do();
    const refundMethodSig = 'cancel_refund(uint64,uint64,uint64,string)void';
    const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());

    SettlementService.validateStateForSettlement(ride, driverAmount, customerAmount, parseInt(ride.fareMicroAlgos, 10));

    const { hash } = SettlementService.generateReceiptHash(ride, driverAmount, customerAmount, 0, 0, 1.0, reason, ride.presenceEvidence);

    const atc = new algosdk.AtomicTransactionComposer();
    const appAccounts = [ride.customer];
    if (ride.rider) appAccounts.push(ride.rider);

    atc.addMethodCall({
      appID: APP_ID,
      method: abiMethod,
      methodArgs: [BigInt(ride.rideId), BigInt(customerAmount), BigInt(driverAmount), hash],
      sender: treasuryAccount.addr,
      suggestedParams: { ...suggestedParams, fee: 4000, flatFee: true },
      signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
      boxes: [
        { appIndex: APP_ID, name: getBoxKey('c_', BigInt(ride.rideId)) },
        { appIndex: APP_ID, name: getBoxKey('f_', BigInt(ride.rideId)) },
        { appIndex: APP_ID, name: getBoxKey('d_', BigInt(ride.rideId)) }
      ],
      appAccounts,
      appForeignAssets: [GIGC_ASSET_ID]
    });

    let result;
    try {
      result = await atc.execute(algodClient, 4);
    } catch (atcError: any) {
      if (atcError.message && atcError.message.includes('pc=508')) {
        console.log(`[auto-settlement] Escrow missing for ride ${ride.rideId}. Syncing DB...`);
        await Ride.findOneAndDelete({ rideId: ride.rideId });
        return;
      }
      throw atcError;
    }
    
    await SettlementAudit.create({
      rideId: ride.rideId,
      driverPayout: driverAmount.toString(),
      customerRefund: customerAmount.toString(),
      settlementReason: reason,
      receiptHash: hash,
      algorandTxId: result.txIDs[0]
    });

    await Ride.findOneAndUpdate(
      { rideId: ride.rideId },
      { 
        status: 'CANCELLED', paymentLocked: false, settlementTxId: result.txIDs[0], 
        receiptHash: hash, cancellationReason: reason, settlementStatus: 'Resolved' 
      }
    );

    console.log(`💸 [Auto-Scanner] Settled ${ride.rideId} (${reason}) TxID: ${result.txIDs[0]}`);
  } catch (err) {
    console.error(`❌ [Auto-Scanner] Refund failed ${ride.rideId}:`, err);
  }
}

setInterval(performAutomaticTimeoutScan, 30000);

export default router;
