import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  profilePhotoBase64: {
    type: String, // Data URL
  },
  outstandingDebt: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export const Customer = mongoose.model('Customer', customerSchema);
