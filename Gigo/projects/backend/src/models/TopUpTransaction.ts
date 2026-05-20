import mongoose, { Document, Schema } from 'mongoose';

export interface ITopUpTransaction extends Document {
  txId: string;
  sender: string;
  algoAmountMicro: number;
  gigcAmountBase: number;
  status: string; // 'pending' | 'success' | 'failed'
  transferTxId?: string; // GIGC transfer transaction ID
  createdAt: Date;
  updatedAt: Date;
}

const TopUpTransactionSchema = new Schema({
  txId: { type: String, required: true, unique: true, index: true },
  sender: { type: String, required: true },
  algoAmountMicro: { type: Number, required: true },
  gigcAmountBase: { type: Number, required: true },
  status: { type: String, required: true, default: 'pending' },
  transferTxId: { type: String, required: false }
}, {
  timestamps: true
});

export default mongoose.models.TopUpTransaction || mongoose.model<ITopUpTransaction>('TopUpTransaction', TopUpTransactionSchema);
