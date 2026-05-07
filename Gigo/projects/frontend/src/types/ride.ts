import type { LucideIcon } from 'lucide-react'

export const RideStatus = {
  IDLE: 'IDLE',
  REQUESTED: 'REQUESTED',
  RIDER_ASSIGNED: 'RIDER_ASSIGNED',
  RIDE_STARTED: 'RIDE_STARTED',
  RIDE_COMPLETED: 'RIDE_COMPLETED',
  PAID: 'PAID',
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
