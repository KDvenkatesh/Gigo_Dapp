import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  status: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  },
  vehicleType: {
    type: String,
  },
  metadataCID: {
    type: String,
  },
}, { timestamps: true });

export const Driver = mongoose.model('Driver', driverSchema);
