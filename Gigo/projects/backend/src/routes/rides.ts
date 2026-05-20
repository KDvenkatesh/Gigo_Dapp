import express from 'express';
import Ride from '../models/Ride';
import algosdk from 'algosdk';
import { ABIMethod } from 'algosdk';

const router = express.Router();

const ALGORAND_NODE = process.env.ALGORAND_NODE || 'https://testnet-api.algonode.cloud';
const algodClient = new algosdk.Algodv2('', ALGORAND_NODE, '');

const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC || '';
const APP_ID = Number(process.env.RIDE_APP_ID || '762339765');

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

// Update ride status and rider
router.post('/update-status', async (req, res) => {
  try {
    const { rideId, status, rider, paymentLocked } = req.body;
    const updateData: any = { status };
    if (rider !== undefined) updateData.rider = rider;
    if (paymentLocked !== undefined) updateData.paymentLocked = paymentLocked;
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

    if (ride.status !== 'Ride Started') {
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
      { status: 'Ride Completed', paymentLocked: false },
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

export default router;
