import mongoose, { Document, Schema } from 'mongoose';

export interface IPassPurchase extends Document {
  txId: string; // The user's GIGC payment transaction ID
  sender: string; // The user's wallet address
  tier: 'silver' | 'gold' | 'platinum';
  passAssetId: number;
  priceGigc: number;
  status: string; // 'pending' | 'success' | 'failed'
  transferTxId?: string; // NFT pass transfer transaction ID
  createdAt: Date;
  updatedAt: Date;
}

const PassPurchaseSchema = new Schema({
  txId: { type: String, required: true, unique: true, index: true },
  sender: { type: String, required: true },
  tier: { type: String, required: true },
  passAssetId: { type: Number, required: true },
  priceGigc: { type: Number, required: true },
  status: { type: String, required: true, default: 'pending' },
  transferTxId: { type: String, required: false }
}, {
  timestamps: true
});

export default mongoose.models.PassPurchase || mongoose.model<IPassPurchase>('PassPurchase', PassPurchaseSchema);
