import type { RideLocation, VehicleOption } from '../types/ride'

export const destinationOptions: RideLocation[] = [
  {
    label: 'Kanchikacherla Market',
    lat: 16.6580,
    lng: 80.3710,
  },
  {
    label: 'Paritala Road Intersection',
    lat: 16.6500,
    lng: 80.3800,
  },
  {
    label: 'Local Health Center',
    lat: 16.6620,
    lng: 80.3650,
  },
  {
    label: 'Kanchikacherla Bus Stop',
    lat: 16.6550,
    lng: 80.3750,
  },
]

export const vehicleOptions: VehicleOption[] = [
  {
    id: 'boda',
    name: 'Boda',
    description: 'Fastest for solo trips and tighter city lanes',
    multiplier: 0.75,
    gradient: 'bg-transparent',
  },
  {
    id: 'car',
    name: 'Car',
    description: 'Comfort-focused standard city ride',
    multiplier: 1.45,
    gradient: 'bg-transparent',
  },
  {
    id: 'auto',
    name: 'Auto',
    description: 'Affordable open-air local transit',
    multiplier: 1.0,
    gradient: 'bg-transparent',
  },
]
