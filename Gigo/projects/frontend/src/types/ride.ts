import type { LucideIcon } from 'lucide-react'

export const RideStatus = {
  IDLE: 'IDLE',
  REQUESTED: 'REQUESTED',
  RIDER_ASSIGNED: 'RIDER_ASSIGNED',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  RIDE_STARTED: 'RIDE_STARTED',
  DROPPED_OFF: 'DROPPED_OFF',
  RIDE_COMPLETED: 'RIDE_COMPLETED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const

export type RideStatus = (typeof RideStatus)[keyof typeof RideStatus]
export type AppRole = 'customer' | 'driver' | 'admin'

export interface RideLocation {
  label: string
  lat: number
  lng: number
}

export interface PlaceSuggestion extends RideLocation {
  id: string
  secondaryLabel?: string
}

export interface VehicleOption {
  id: string
  name: string
  description: string
  multiplier: number
  gradient: string
}

export interface RideRecord {
  rideId: bigint
  customer: string
  rider?: string
  status: RideStatus
  pickup: RideLocation
  drop: RideLocation
  fareMicroAlgos: bigint
  paymentLocked: boolean
  otp?: string
  vehicleType?: string
  customerPressedImHere?: boolean
  driverArrivalAt?: string
  waitTimeFee?: string
  receiptHash?: string
  settlementReason?: string
  weatherMultiplier?: number
  trafficDelayFee?: string
  settlementTxId?: string
  cancellationReason?: string
}

export interface ToastMessage {
  id: string
  title: string
  description: string
  tone: 'info' | 'success' | 'error'
}

export interface ContractNotice {
  tone: 'neutral' | 'warning' | 'success'
  title: string
  description: string
  icon: LucideIcon
}
