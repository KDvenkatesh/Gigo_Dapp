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
  baseFareMicroAlgos?: string;
  weatherMultiplier?: number;
  waitTimeFee?: string;
  trafficDelayFee?: string;
  driverReputation?: number;
  cancellationReason?: string;
  estimatedDistanceKm?: number;
  settlementTxId?: string;
  driverArrivalAt?: Date;
  otp?: string;
  otpVerified?: boolean;
  noShowCompensation?: string;
  escrowCreatedAt?: Date;
  lastStateUpdate?: Date;
  settlementStatus?: string;
  reputationReason?: string;
  reputationDelta?: number;
  receiptHash?: string;
  paymentLocked: boolean;
  vehicleType: string;
  rideStartedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Presence & Audit Additions
  customerOpenedRideScreen?: boolean;
  customerViewedOTP?: boolean;
  customerPressedImHere?: boolean;
  customerPickupInteraction?: boolean;
  
  rideScreenOpenedAt?: Date;
  otpViewedAt?: Date;
  imHerePressedAt?: Date;
  pickupInteractionAt?: Date;
  
  presenceEvidence?: string[];
  settlementReason?: string;
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
  status: { type: String, required: true, enum: ['IDLE', 'REQUESTED', 'RIDER_ASSIGNED', 'DRIVER_ARRIVED', 'RIDE_STARTED', 'DROPPED_OFF', 'RIDE_COMPLETED', 'PAID', 'CANCELLED'] },
  fareMicroAlgos: { type: String, required: true },
  baseFareMicroAlgos: { type: String, required: false },
  weatherMultiplier: { type: Number, required: false },
  waitTimeFee: { type: String, required: false },
  trafficDelayFee: { type: String, required: false },
  driverReputation: { type: Number, required: false },
  cancellationReason: { type: String, required: false },
  estimatedDistanceKm: { type: Number, required: false },
  settlementTxId: { type: String, required: false },
  driverArrivalAt: { type: Date, required: false },
  otp: { type: String, required: false },
  otpVerified: { type: Boolean, required: false, default: false },
  noShowCompensation: { type: String, required: false },
  escrowCreatedAt: { type: Date, required: false },
  lastStateUpdate: { type: Date, required: false },
  settlementStatus: { type: String, required: false },
  reputationReason: { type: String, required: false },
  reputationDelta: { type: Number, required: false },
  receiptHash: { type: String, required: false },
  paymentLocked: { type: Boolean, required: true, default: true },
  vehicleType: { type: String, required: true },
  rideStartedAt: { type: Date, required: false },

  // Presence & Audit Additions
  customerOpenedRideScreen: { type: Boolean, required: false, default: false },
  customerViewedOTP: { type: Boolean, required: false, default: false },
  customerPressedImHere: { type: Boolean, required: false, default: false },
  customerPickupInteraction: { type: Boolean, required: false, default: false },

  rideScreenOpenedAt: { type: Date, required: false },
  otpViewedAt: { type: Date, required: false },
  imHerePressedAt: { type: Date, required: false },
  pickupInteractionAt: { type: Date, required: false },
  
  presenceEvidence: { type: [String], required: false, default: [] },
  settlementReason: { type: String, required: false },
  isSurge: { type: Boolean, required: false, default: false },
}, {
  timestamps: true
});

export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);
