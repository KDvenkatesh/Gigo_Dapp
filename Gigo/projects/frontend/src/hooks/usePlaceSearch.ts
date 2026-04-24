import { useDeferredValue, useEffect, useState } from 'react'
import type { PlaceSuggestion, RideLocation } from '../types/ride'

function mapResultToSuggestion(result: {
  place_id: number
  display_name: string
  lat: string
  lon: string
}) {
  const [primary, ...rest] = result.display_name.split(',')

  return {
    id: String(result.place_id),
    label: primary.trim(),
    secondaryLabel: rest.join(',').trim(),
    lat: Number(result.lat),
    lng: Number(result.lon),
  } satisfies PlaceSuggestion
}

export function usePlaceSearch(query: string, enabled = true) {
  const deferredQuery = useDeferredValue(query)
  const [results, setResults] = useState<PlaceSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!enabled || deferredQuery.trim().length < 3) {
      setResults([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          q: deferredQuery,
          format: 'jsonv2',
          limit: '5',
          addressdetails: '1',
          countrycodes: 'in',
        })
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })
        const data = (await response.json()) as Array<{
          place_id: number
          display_name: string
          lat: string
          lon: string
        }>
        setResults(data.map(mapResultToSuggestion))
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [deferredQuery, enabled])

  return { results, isLoading }
}

export async function reverseGeocodeLocation(location: RideLocation) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(location.lat),
    lon: String(location.lng),
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
    },
  })
  const data = (await response.json()) as { display_name?: string }

  return {
    ...location,
    label: data.display_name?.split(',')[0]?.trim() || location.label,
  }
}
