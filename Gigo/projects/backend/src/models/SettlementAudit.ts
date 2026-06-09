import mongoose from 'mongoose';

export interface ISettlementAudit extends mongoose.Document {
  rideId: string;
  driverPayout: string;
  customerRefund: string;
  settlementReason: string;
  receiptHash: string;
  algorandTxId: string;
  createdAt: Date;
}

const settlementAuditSchema = new mongoose.Schema({
  rideId: { type: String, required: true },
  driverPayout: { type: String, required: true },
  customerRefund: { type: String, required: true },
  settlementReason: { type: String, required: true },
  receiptHash: { type: String, required: true },
  algorandTxId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const SettlementAudit = mongoose.model<ISettlementAudit>('SettlementAudit', settlementAuditSchema);
