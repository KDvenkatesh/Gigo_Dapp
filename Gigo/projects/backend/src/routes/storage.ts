import { Router } from 'express';
import multer from 'multer';
import { pinataService } from '../services/pinataService';
import { db } from '../lib/db';
import { Driver } from '../models/Driver';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a single file to IPFS
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { walletAddress, role, dataType } = req.body;
    let metadata;
    if (walletAddress && role) {
      metadata = {
        name: `${walletAddress} - ${role} - ${dataType || 'file'} - ${req.file.originalname}`,
        keyvalues: { wallet: walletAddress, role, dataType: dataType || 'file' }
      };
    }

    const result = await pinataService.pinFileToIPFS(req.file.buffer, req.file.originalname, metadata);
    res.json({ cid: result.IpfsHash });
  } catch (error: any) {
    console.error('IPFS Upload Error Context:', {
      message: error.message,
      stack: error.stack,
      pinataResponse: error.response?.data
    });
    res.status(500).json({ 
      error: 'Failed to upload to IPFS',
      details: error.message,
      cause: error.cause ? error.cause.message : undefined
    });
  }
});

// Upload JSON metadata to IPFS
router.post('/upload-json', async (req, res) => {
  try {
    const { data, walletAddress, role, dataType } = req.body;
    
    // Fallback for backwards compatibility if frontend doesn't send wrapped body yet
    const jsonToPin = data ? data : req.body;
    
    let metadata;
    if (walletAddress && role) {
      metadata = {
        name: `${walletAddress} - ${role} - ${dataType || 'metadata'}.json`,
        keyvalues: { wallet: walletAddress, role, dataType: dataType || 'metadata' }
      };
    }

    const result = await pinataService.pinJSONToIPFS(jsonToPin, metadata);
    res.json({ cid: result.IpfsHash });
  } catch (error: any) {
    console.error('IPFS JSON Upload Error Context:', {
      message: error.message,
      stack: error.stack,
      pinataResponse: error.response?.data
    });
    res.status(500).json({ 
      error: 'Failed to upload JSON to IPFS',
      details: error.message
    });
  }
});

// Save or Get metadata CID for a driver
router.post('/driver-metadata', async (req, res) => {
  const { walletAddress, metadataCID, status, vehicleType } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'walletAddress is required' });
  }

  try {
    if (metadataCID || status || vehicleType) {
      // Update in MongoDB
      const updateData: any = {};
      if (metadataCID) updateData.metadataCID = metadataCID;
      if (status) updateData.status = status;
      if (vehicleType) updateData.vehicleType = vehicleType;

      const driver = await Driver.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        { $set: updateData },
        { new: true, upsert: true }
      );
      
      // Fallback
      if (metadataCID) db.saveDriverCID(walletAddress, metadataCID);
      return res.json({ success: true, driver });
    }

    // Get from MongoDB
    const driver = await Driver.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (driver) {
      return res.json({ 
        cid: driver.metadataCID,
        status: driver.status,
        vehicleType: driver.vehicleType
      });
    }

    const cid = db.getDriverCID(walletAddress);
    res.json({ cid, status: 'none' });
  } catch (error: any) {
    console.error('Driver Metadata Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all drivers (for admin)
router.get('/all-drivers', async (req, res) => {
  try {
    const drivers = await Driver.find({});
    // Map to old format for backwards compatibility { 'address': { metadataCID, updatedAt, status, vehicleType } }
    const result: Record<string, any> = {};
    for (const d of drivers) {
      result[d.walletAddress] = {
        metadataCID: d.metadataCID,
        updatedAt: (d as any).updatedAt,
        status: d.status,
        vehicleType: d.vehicleType
      };
    }
    res.json(result);
  } catch (error) {
    // Fallback
    const drivers = db.getAllDrivers();
    res.json(drivers);
  }
});

import { Customer } from '../models/Customer';

// Customer Endpoints
router.post('/customer-profile', async (req, res) => {
  try {
    const { walletAddress, profilePhotoBase64 } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    
    // Save to MongoDB
    await Customer.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() },
      { $set: { profilePhotoBase64 } },
      { new: true, upsert: true }
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Save Customer Profile Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

router.post('/get-customer-profile', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    
    const customer = await Customer.findOne({ walletAddress: walletAddress.toLowerCase() });
    res.json({ profilePhotoBase64: customer?.profilePhotoBase64 || null });
  } catch (error: any) {
    console.error('Get Customer Profile Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Ride Endpoints
router.post('/ride-metadata', (req, res) => {
  const { rideId, metadataCID } = req.body;
  if (!rideId || !metadataCID) {
    return res.status(400).json({ error: 'rideId and metadataCID are required' });
  }
  db.saveRideCID(rideId, metadataCID);
  res.json({ success: true });
});

router.get('/all-rides', (req, res) => {
  const rides = db.getAllRides();
  res.json(rides);
});

router.post('/get-ride-metadata', (req, res) => {
  const { rideId } = req.body;
  const cid = db.getRideCID(rideId);
  res.json({ cid });
});

export default router;
