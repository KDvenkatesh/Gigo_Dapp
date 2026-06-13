import { useEffect, useRef, useState } from 'react'
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
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!geolocationSupported) return

    // Use watchPosition for continuous live GPS updates (not just a one-shot)
    watchIdRef.current = navigator.geolocation.watchPosition(
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
        setLocationError(null)
      },
      () => {
        setLocation(defaultLocation)
        setIsLocating(false)
        setLocationError('Live location is unavailable. Using city center fallback.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [geolocationSupported])

  return { location, isLocating, locationError }
}

