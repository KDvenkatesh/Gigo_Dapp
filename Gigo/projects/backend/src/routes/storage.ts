import { Router } from 'express';
import multer from 'multer';
import { pinataService } from '../services/pinataService';
import { db } from '../lib/db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a single file to IPFS
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pinataService.pinFileToIPFS(req.file.buffer, req.file.originalname);
    res.json({ cid: result.IpfsHash });
  } catch (error: any) {
    console.error('IPFS Upload Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload to IPFS' });
  }
});

// Upload JSON metadata to IPFS
router.post('/upload-json', async (req, res) => {
  try {
    const result = await pinataService.pinJSONToIPFS(req.body);
    res.json({ cid: result.IpfsHash });
  } catch (error: any) {
    console.error('IPFS JSON Upload Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload JSON to IPFS' });
  }
});

// Save or Get metadata CID for a driver
router.post('/driver-metadata', (req, res) => {
  const { walletAddress, metadataCID } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'walletAddress is required' });
  }

  if (metadataCID) {
    db.saveDriverCID(walletAddress, metadataCID);
    return res.json({ success: true });
  }

  const cid = db.getDriverCID(walletAddress);
  res.json({ cid });
});

// Get all drivers (for admin)
router.get('/all-drivers', (req, res) => {
  const drivers = db.getAllDrivers();
  res.json(drivers);
});

// Customer Endpoints
router.post('/customer-profile', (req, res) => {
  const { walletAddress, profileCID } = req.body;
  if (!walletAddress || !profileCID) {
    return res.status(400).json({ error: 'walletAddress and profileCID are required' });
  }
  db.saveCustomerCID(walletAddress, profileCID);
  res.json({ success: true });
});

router.post('/get-customer-profile', (req, res) => {
  const { walletAddress } = req.body;
  const cid = db.getCustomerCID(walletAddress);
  res.json({ cid });
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
