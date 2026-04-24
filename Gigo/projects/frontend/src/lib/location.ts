import type { RideLocation } from '../types/ride'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function encodeRideLocation(location: RideLocation) {
  return encoder.encode(JSON.stringify(location))
}

export function decodeRideLocation(value: Uint8Array): RideLocation {
  let parsed: RideLocation | null = null

  try {
    parsed = JSON.parse(decoder.decode(value)) as RideLocation
  } catch {
    parsed = null
  }

  if (parsed && typeof parsed.label === 'string' && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
    return parsed
  }

  return {
    label: decoder.decode(value) || 'Unknown location',
    lat: 12.9716,
    lng: 77.5946,
  }
}

export function toUtf8Bytes(value: string) {
  return encoder.encode(value)
}

export function formatAlgoAmount(microAlgos: bigint) {
  return `${(Number(microAlgos) / 1_000_000).toFixed(3)} ALGO`
}

export function calculateDistanceKm(from: RideLocation, to: RideLocation) {
  const earthRadiusKm = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const originLat = toRadians(from.lat)
  const destLat = toRadians(to.lat)

  const arc =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originLat) * Math.cos(destLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc))

  return earthRadiusKm * c
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function deriveLocationFromLabel(label: string): RideLocation {
  const normalized = label.trim() || 'Custom destination'
  let hash = 0

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(index)
    hash |= 0
  }

  const latOffset = ((Math.abs(hash) % 220) - 110) / 1000
  const lngOffset = ((Math.abs(hash * 7) % 260) - 130) / 1000

  return {
    label: normalized,
    lat: 12.9716 + latOffset,
    lng: 77.5946 + lngOffset,
  }
}
