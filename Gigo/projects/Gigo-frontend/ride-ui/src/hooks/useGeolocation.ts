import { useEffect, useState } from 'react'
import { reverseGeocodeLocation } from './usePlaceSearch'
import type { RideLocation } from '../types/ride'

const defaultLocation: RideLocation = {
  label: 'Bengaluru City Center',
  lat: 12.9716,
  lng: 77.5946,
}

export function useGeolocation() {
  const geolocationSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const [location, setLocation] = useState<RideLocation>(defaultLocation)
  const [isLocating, setIsLocating] = useState(geolocationSupported)
  const [locationError, setLocationError] = useState<string | null>(
    geolocationSupported ? null : 'Geolocation is not supported in this browser.',
  )

  useEffect(() => {
    if (!geolocationSupported) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLocation = {
          label: 'Current location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        try {
          setLocation(await reverseGeocodeLocation(nextLocation))
        } catch {
          setLocation(nextLocation)
        }
        setIsLocating(false)
      },
      () => {
        setLocation(defaultLocation)
        setIsLocating(false)
        setLocationError('Using fallback city center because live location is blocked.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    )
  }, [geolocationSupported])

  return { location, isLocating, locationError }
}
