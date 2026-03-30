import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { RideLocation } from '../types/ride'

/* ── Marker icons ── */
function makePinIcon(bg: string, letter: string) {
  return L.divIcon({
    className: '',
    iconSize: [40, 54],
    iconAnchor: [20, 54],
    html: `<div style="width:40px;height:54px;display:flex;flex-direction:column;align-items:center">
      <div style="
        width:36px;height:36px;
        background:${bg};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 16px rgba(0,0,0,0.45);
        border:2.5px solid rgba(255,255,255,0.85)
      ">
        <span style="transform:rotate(45deg);font-size:12px;font-weight:900;color:#fff;font-family:system-ui">${letter}</span>
      </div>
      <div style="width:2px;height:14px;background:${bg};opacity:0.7;border-radius:2px;margin-top:2px"></div>
    </div>`,
  })
}

const pickupPin = makePinIcon('#10b981', 'A')
const dropPin   = makePinIcon('#3b82f6', 'B')

/* ── OSRM road route ── */
async function fetchRoute(from: RideLocation, to: RideLocation): Promise<LatLngExpression[]> {
  if (from.lat === to.lat && from.lng === to.lng) return [[from.lat, from.lng], [to.lat, to.lng]]
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error()
    const data = await res.json() as { routes?: Array<{ geometry: { coordinates: [number, number][] } }> }
    const coords = data.routes?.[0]?.geometry?.coordinates ?? []
    return coords.length > 0
      ? coords.map(([lng, lat]) => [lat, lng] as LatLngExpression)
      : [[from.lat, from.lng], [to.lat, to.lng]]
  } catch {
    return [[from.lat, from.lng], [to.lat, to.lng]]
  }
}

/* ── Auto-fit bounds ── */
function FitBounds({ pickup, drop }: { pickup: RideLocation; drop: RideLocation }) {
  const map = useMap()
  const key = `${pickup.lat}${pickup.lng}${drop.lat}${drop.lng}`
  const prev = useRef('')
  useEffect(() => {
    if (prev.current === key) return
    prev.current = key
    if (pickup.lat === 0 && drop.lat === 0) return
    const b = L.latLngBounds([pickup.lat, pickup.lng], [drop.lat, drop.lng])
    if (b.isValid()) map.fitBounds(b.pad(0.28), { animate: true, duration: 1 })
    else if (pickup.lat !== 0) map.setView([pickup.lat, pickup.lng], 15, { animate: true })
  })
  return null
}

/* ── Click handler ── */
function ClickHandler({
  mode,
  onPick,
}: {
  mode: 'pickup' | 'drop' | null
  onPick?: (c: { lat: number; lng: number }, m: 'pickup' | 'drop') => void
}) {
  useMapEvents({ click: (e) => { if (mode && onPick) onPick({ lat: e.latlng.lat, lng: e.latlng.lng }, mode) } })
  return null
}

/* ── Component ── */
export interface BookingMapProps {
  pickup: RideLocation
  drop: RideLocation
  selectionMode?: 'pickup' | 'drop' | null
  onPickLocation?: (coords: { lat: number; lng: number }, mode: 'pickup' | 'drop') => void
}

export function BookingMap({ pickup, drop, selectionMode = null, onPickLocation }: BookingMapProps) {
  const [route, setRoute] = useState<LatLngExpression[]>([[pickup.lat, pickup.lng], [drop.lat, drop.lng]])
  const routeKey = `${pickup.lat},${pickup.lng},${drop.lat},${drop.lng}`
  const prevRouteKey = useRef('')

  useEffect(() => {
    if (prevRouteKey.current === routeKey) return
    prevRouteKey.current = routeKey
    const timer = window.setTimeout(() => {
      void fetchRoute(pickup, drop).then(setRoute)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [routeKey])

  const center: LatLngExpression = pickup.lat !== 0
    ? [pickup.lat, pickup.lng]
    : [12.9716, 77.5946] // Bangalore default

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        key={routeKey}
        center={center}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#0d1117' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <FitBounds pickup={pickup} drop={drop} />
        <ClickHandler mode={selectionMode} onPick={onPickLocation} />

        {route.length > 1 && (
          <>
            <Polyline positions={route} pathOptions={{ color: '#38bdf8', weight: 14, opacity: 0.12 }} />
            <Polyline positions={route} pathOptions={{ color: '#38bdf8', weight: 5, opacity: 1 }} />
            <Polyline positions={route} pathOptions={{ color: '#fff', weight: 2, opacity: 0.3, dashArray: '8 12' }} />
          </>
        )}

        {pickup.lat !== 0 && <Marker position={[pickup.lat, pickup.lng]} icon={pickupPin} />}
        {drop.lat !== 0 && drop.lat !== pickup.lat && <Marker position={[drop.lat, drop.lng]} icon={dropPin} />}
      </MapContainer>

    </div>
  )
}
