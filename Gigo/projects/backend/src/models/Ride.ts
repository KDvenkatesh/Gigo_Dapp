import mongoose, { Document, Schema } from 'mongoose';

export interface IRideLocation {
  label: string;
  lat: number;
  lng: number;
}

export interface IRide extends Document {
  rideId: string;
  customer: string;
  rider?: string;
  pickup: IRideLocation;
  drop: IRideLocation;
  status: string;
  fareMicroAlgos: string;
  otp?: string;
  paymentLocked: boolean;
  vehicleType: string;
  createdAt: Date;
  updatedAt: Date;
}

const RideLocationSchema = new Schema({
  label: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

const RideSchema = new Schema({
  rideId: { type: String, required: true, unique: true, index: true },
  customer: { type: String, required: true },
  rider: { type: String, required: false },
  pickup: { type: RideLocationSchema, required: true },
  drop: { type: RideLocationSchema, required: true },
  status: { type: String, required: true, default: 'Requested' },
  fareMicroAlgos: { type: String, required: true },
  otp: { type: String, required: false },
  paymentLocked: { type: Boolean, required: true, default: true },
  vehicleType: { type: String, required: true }
}, {
  timestamps: true
});

export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);
