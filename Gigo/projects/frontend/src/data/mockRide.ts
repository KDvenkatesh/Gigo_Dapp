import type { RideLocation, VehicleOption } from '../types/ride'

export const destinationOptions: RideLocation[] = [
  {
    label: 'Pandit Nehru Bus Station (PNBS)',
    lat: 16.97922091638517,
    lng: 80.43056361233575,
  },
  {
    label: 'PVP Square',
    lat: 16.997591235107097,
    lng: 80.42863591267285,
  },
  {
    label: 'TrendSet Mall Vijayawada',
    lat: 16.95288470335778,
    lng: 80.6075177842472,
  },
  {
    label: 'Eluru Road',
    lat: 16.97684381141231,
    lng: 80.63564659901553,
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
