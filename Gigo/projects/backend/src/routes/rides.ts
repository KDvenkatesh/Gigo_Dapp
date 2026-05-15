import express from 'express';
import Ride from '../models/Ride';

const router = express.Router();

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
    
    // UPSERT: If ride already exists (e.g. retry), just update it
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

export default router;
