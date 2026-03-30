import type { RideLocation, VehicleOption } from '../types/ride'

export const destinationOptions: RideLocation[] = [
  {
    label: 'Kempegowda International Airport',
    lat: 13.1986,
    lng: 77.7066,
  },
  {
    label: 'Electronic City Phase 1',
    lat: 12.8399,
    lng: 77.677,
  },
  {
    label: 'Indiranagar 100 Feet Road',
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    label: 'Majestic Bus Station',
    lat: 12.9762,
    lng: 77.5727,
  },
]

export const vehicleOptions: VehicleOption[] = [
  {
    id: 'bike',
    name: 'Bike',
    description: 'Fastest for solo trips and tighter city lanes',
    multiplier: 0.75,
    gradient: 'bg-gradient-to-br from-emerald-300 to-emerald-500',
  },
  {
    id: 'auto',
    name: 'Auto',
    description: 'Affordable local ride with quick pickup',
    multiplier: 1,
    gradient: 'bg-gradient-to-br from-amber-200 to-orange-400',
  },
  {
    id: 'car',
    name: 'Car',
    description: 'Comfort-focused standard city ride',
    multiplier: 1.45,
    gradient: 'bg-gradient-to-br from-sky-300 to-cyan-500',
  },
]
