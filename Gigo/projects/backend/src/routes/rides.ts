import express from 'express';
import Ride from '../models/Ride';
import algosdk from 'algosdk';
import { ABIMethod } from 'algosdk';

const router = express.Router();

const ALGORAND_NODE = process.env.ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || '';
const APP_ID = Number(process.env.RIDE_APP_ID || '762339765');
const GIGC_ASSET_ID = Number(process.env.GIGC_ASSET_ID || '762258472');

// Haversine formula: returns distance in km between two GPS coordinates
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

// Helper to generate the 10-byte box key (2-byte prefix + 8-byte big-endian uint64 ride ID)
function getBoxKey(prefix: string, rideId: bigint): Uint8Array {
  const prefixBytes = Buffer.from(prefix);
  const rideIdBytes = Buffer.alloc(8);
  rideIdBytes.writeBigUInt64BE(rideId);
  return new Uint8Array(Buffer.concat([prefixBytes, rideIdBytes]));
}

// Get all active rides
router.get('/', async (req, res) => {
  try {
    const rides = await Ride.find().sort({ createdAt: -1 }).limit(100);
    res.json(rides);
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Create a new ride
router.post('/create', async (req, res) => {
  try {
    const { rideId, customer, pickup, drop, fareMicroAlgos, vehicleType, status, paymentLocked } = req.body;
    const ride = await Ride.findOneAndUpdate(
      { rideId },
      { customer, pickup, drop, fareMicroAlgos, vehicleType, status: status || 'Requested', paymentLocked: paymentLocked !== undefined ? paymentLocked : true },
      { returnDocument: 'after', upsert: true }
    );
    res.json({ success: true, ride });
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({ error: 'Failed to create ride' });
  }
});

// Update ride status and rider — also stamps rideStartedAt when ride begins
router.post('/update-status', async (req, res) => {
  try {
    const { rideId, status, rider, paymentLocked } = req.body;
    const updateData: any = { status };
    if (rider !== undefined) updateData.rider = rider;
    if (paymentLocked !== undefined) updateData.paymentLocked = paymentLocked;
    // Stamp the time when driver actually starts driving
    if (status === 'RIDE_STARTED') updateData.rideStartedAt = new Date();
    const ride = await Ride.findOneAndUpdate(
      { rideId },
      updateData,
      { returnDocument: 'after' }
    );
    res.json({ success: true, ride });
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

// Store OTP
router.post('/store-otp', async (req, res) => {
  try {
    const { rideId, otp } = req.body;
    const ride = await Ride.findOneAndUpdate(
      { rideId },
      { otp },
      { returnDocument: 'after' }
    );
    res.json({ success: true, ride });
  } catch (error) {
    console.error('Error storing OTP:', error);
    res.status(500).json({ error: 'Failed to store OTP' });
  }
});

// Delete a ride (for clearing history)
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
    console.error('Error clearing rides:', error);
    res.status(500).json({ error: 'Failed to clear rides' });
  }
});

/**
 * POST /api/rides/check-timeout
 * Called by the customer's frontend every 30s when ride is in "Ride Started" state.
 * If the driver hasn't reached the drop location within 10 minutes, the backend
 * automatically triggers cancel_and_refund on the smart contract.
 */
router.post('/check-timeout', async (req, res) => {
  try {
    const { rideId } = req.body;
    if (!rideId) return res.status(400).json({ error: 'Missing rideId' });

    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Only applies to active rides
    if (ride.status !== 'RIDE_STARTED') {
      return res.json({ timedOut: false, status: ride.status });
    }

    const startedAt = ride.rideStartedAt;
    if (!startedAt) {
      // Stamp now if missing (legacy rides)
      await Ride.findOneAndUpdate({ rideId }, { rideStartedAt: new Date() });
      return res.json({ timedOut: false, minutesElapsed: 0, minutesRemaining: 10 });
    }

    const elapsedMs = Date.now() - new Date(startedAt).getTime();
    const elapsedMins = elapsedMs / 60000;
    const minutesRemaining = Math.max(0, 10 - elapsedMins);

    if (elapsedMins < 10) {
      return res.json({ timedOut: false, minutesElapsed: elapsedMins, minutesRemaining });
    }

    // ⏰ TIMEOUT — auto-refund customer
    console.log(`⏰ Ride ${rideId} timed out after ${elapsedMins.toFixed(1)} min — triggering refund`);

    if (!TREASURY_MNEMONIC) {
      return res.status(500).json({ error: 'Treasury wallet not configured for refund' });
    }

    try {
      const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
      const suggestedParams = await algodClient.getTransactionParams().do();

      // ABI call: cancel_and_refund(uint64 ride_id) void
      const refundMethodSig = 'cancel_and_refund(uint64)void';
      const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());

      const atc = new algosdk.AtomicTransactionComposer();
      atc.addMethodCall({
        appID: APP_ID,
        method: abiMethod,
        methodArgs: [BigInt(rideId)],
        sender: treasuryAccount.addr,
        suggestedParams: { ...suggestedParams, fee: 2000, flatFee: true },
        signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
        boxes: [
          { appIndex: APP_ID, name: getBoxKey('c_', BigInt(rideId)) },
          { appIndex: APP_ID, name: getBoxKey('f_', BigInt(rideId)) }
        ],
        appAccounts: [ride.customer],
        appForeignAssets: [GIGC_ASSET_ID]
      });

      const result = await atc.execute(algodClient, 4);
      const refundTxId = result.txIDs[0];

      // Update ride status in DB
      await Ride.findOneAndUpdate(
        { rideId },
        { status: 'CANCELLED', paymentLocked: false },
        { returnDocument: 'after' }
      );

      console.log(`💸 Refund to customer ${ride.customer} — TxID: ${refundTxId}`);
      return res.json({ timedOut: true, refunded: true, refundTxId });

    } catch (chainErr: any) {
      console.error('Refund transaction failed:', chainErr?.message);
      return res.status(500).json({
        timedOut: true,
        refunded: false,
        error: 'Timeout detected but refund transaction failed. Contact support.',
        detail: chainErr?.message,
      });
    }

  } catch (error: any) {
    console.error('Error in check-timeout:', error);
    res.status(500).json({ error: error?.message || 'Failed to check timeout' });
  }
});

/**
 * POST /api/rides/end-ride
 * Called by the driver when they click "End Ride".
 *
 * Flow:
 *   1. Validate driver GPS is within 0.5km of the drop location.
 *   2. Mark ride as Ride Completed in MongoDB.
 *   3. Backend treasury wallet calls smart contract payout() method
 *      → GIGC automatically sent to the driver wallet on-chain.
 */
router.post('/end-ride', async (req, res) => {
  try {
    const { rideId, driverAddress, driverLat, driverLng } = req.body;

    if (!rideId || !driverAddress || driverLat == null || driverLng == null) {
      return res.status(400).json({
        error: 'Missing required fields: rideId, driverAddress, driverLat, driverLng',
      });
    }

    // 1. Fetch ride from MongoDB
    const ride = await Ride.findOne({ rideId });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.status !== 'RIDE_STARTED') {
      return res.status(400).json({ error: `Cannot end ride in status: ${ride.status}` });
    }

    // 2. GPS proximity check — driver must be within 0.5 km of drop location
    const dropLat = (ride.drop as any)?.lat;
    const dropLng = (ride.drop as any)?.lng;

    if (dropLat == null || dropLng == null) {
      return res.status(400).json({ error: 'Ride has no drop location coordinates stored' });
    }

    const distKm = haversineKm(Number(driverLat), Number(driverLng), Number(dropLat), Number(dropLng));
    console.log(`🗺️  Driver distance from drop: ${distKm.toFixed(3)} km`);

    if (distKm > 0.5) {
      return res.status(400).json({
        error: `You are ${distKm.toFixed(2)} km away from the drop location. Please reach the drop point first (within 0.5 km).`,
        distanceKm: distKm,
      });
    }

    // 3. Mark ride completed in MongoDB
    await Ride.findOneAndUpdate(
      { rideId },
      { status: 'RIDE_COMPLETED', paymentLocked: false },
      { returnDocument: 'after' }
    );
    console.log(`✅ Ride ${rideId} marked as Completed in DB`);

    // 4. Execute blockchain payout via treasury (admin/creator) wallet
    if (!TREASURY_MNEMONIC) {
      console.error('TREASURY_MNEMONIC not configured — skipping chain payout');
      return res.json({ success: true, payoutSkipped: true, reason: 'Treasury wallet not configured' });
    }

    try {
      const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
      const suggestedParams = await algodClient.getTransactionParams().do();

      // ABI call: payout(uint64 ride_id, account rider) void
      const payoutMethodSig = 'payout(uint64,account)void';
      const abiMethod = new ABIMethod(ABIMethod.fromSignature(payoutMethodSig).toJSON());

      const atc = new algosdk.AtomicTransactionComposer();
      atc.addMethodCall({
        appID: APP_ID,
        method: abiMethod,
        methodArgs: [BigInt(rideId), driverAddress],
        sender: treasuryAccount.addr,
        suggestedParams: { ...suggestedParams, fee: 2000, flatFee: true },
        signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
        boxes: [
          { appIndex: APP_ID, name: getBoxKey('c_', BigInt(rideId)) },
          { appIndex: APP_ID, name: getBoxKey('f_', BigInt(rideId)) }
        ],
        appAccounts: [driverAddress],
        appForeignAssets: [GIGC_ASSET_ID]
      });

      const result = await atc.execute(algodClient, 4);
      const payoutTxId = result.txIDs[0];

      console.log(`💰 Payout to driver ${driverAddress} — TxID: ${payoutTxId}`);
      return res.json({ success: true, payoutTxId });

    } catch (chainErr: any) {
      console.error('Blockchain payout failed:', chainErr?.message);
      // Ride is COMPLETED in DB — can be manually retried
      return res.status(500).json({
        error: 'Ride completed but blockchain payout failed. Please contact support.',
        detail: chainErr?.message,
      });
    }

  } catch (error: any) {
    console.error('Error in end-ride:', error);
    res.status(500).json({ error: error?.message || 'Failed to end ride' });
  }
});

// Background Auto-Scanner to refund timed out rides automatically
async function performAutomaticTimeoutScan() {
  try {
    const activeRides = await Ride.find({ status: 'RIDE_STARTED' });
    if (!activeRides || activeRides.length === 0) return;

    for (const ride of activeRides) {
      const startedAt = ride.rideStartedAt;
      if (!startedAt) continue;

      const elapsedMs = Date.now() - new Date(startedAt).getTime();
      const elapsedMins = elapsedMs / 60000;

      // 10 minutes timeout limit
      if (elapsedMins >= 10) {
        console.log(`⏰ [Auto-Scanner] Ride ${ride.rideId} timed out after ${elapsedMins.toFixed(1)} mins. Executing automatic refund...`);
        
        if (!TREASURY_MNEMONIC) {
          console.error('❌ [Auto-Scanner] TREASURY_MNEMONIC not configured — skipping refund');
          continue;
        }

        try {
          const treasuryAccount = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC.trim());
          const suggestedParams = await algodClient.getTransactionParams().do();
          const refundMethodSig = 'cancel_and_refund(uint64)void';
          const abiMethod = new ABIMethod(ABIMethod.fromSignature(refundMethodSig).toJSON());

          const atc = new algosdk.AtomicTransactionComposer();
          atc.addMethodCall({
            appID: APP_ID,
            method: abiMethod,
            methodArgs: [BigInt(ride.rideId)],
            sender: treasuryAccount.addr,
            suggestedParams: { ...suggestedParams, fee: 2000, flatFee: true },
            signer: algosdk.makeBasicAccountTransactionSigner(treasuryAccount),
            boxes: [
              { appIndex: APP_ID, name: getBoxKey('c_', BigInt(ride.rideId)) },
              { appIndex: APP_ID, name: getBoxKey('f_', BigInt(ride.rideId)) }
            ],
            appAccounts: [ride.customer],
            appForeignAssets: [GIGC_ASSET_ID]
          });

          const result = await atc.execute(algodClient, 4);
          const refundTxId = result.txIDs[0];

          await Ride.findOneAndUpdate(
            { rideId: ride.rideId },
            { status: 'CANCELLED', paymentLocked: false }
          );

          console.log(`💸 [Auto-Scanner] Automatically refunded ride ${ride.rideId} to customer ${ride.customer} — TxID: ${refundTxId}`);
        } catch (chainErr: any) {
          console.error(`❌ [Auto-Scanner] Automatic refund failed for ride ${ride.rideId}:`, chainErr?.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ [Auto-Scanner] Error performing background timeout scan:', err);
  }
}

// Start background auto-scanner task every 30 seconds
setInterval(performAutomaticTimeoutScan, 30000);

export default router;
