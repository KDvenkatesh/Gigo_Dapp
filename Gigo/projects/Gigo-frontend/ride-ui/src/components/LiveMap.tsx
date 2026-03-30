import { motion } from 'framer-motion'
import L from 'leaflet'
import { MapPin, Navigation } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import type { RideLocation } from '../types/ride'

interface LiveMapProps {
  pickup: RideLocation
  drop: RideLocation
  title: string
  subtitle: string
  selectionMode?: 'pickup' | 'drop' | null
  onPickLocation?: (coords: { lat: number; lng: number }, mode: 'pickup' | 'drop') => void
}

const pickupIcon = L.divIcon({
  className: 'leaflet-marker-shell',
  html: '<div class="leaflet-marker leaflet-marker-pickup"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const dropIcon = L.divIcon({
  className: 'leaflet-marker-shell',
  html: '<div class="leaflet-marker leaflet-marker-drop"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function isValid(loc: RideLocation) {
  return typeof loc.lat === 'number' && typeof loc.lng === 'number' && !isNaN(loc.lat) && !isNaN(loc.lng)
}

function FitBounds({ pickup, drop }: { pickup: RideLocation; drop: RideLocation }) {
  const map = useMap()

  const bounds = useMemo(() => {
    if (!isValid(pickup) || !isValid(drop)) return null
    return L.latLngBounds([pickup.lat, pickup.lng], [drop.lat, drop.lng])
  }, [pickup, drop])

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds.pad(0.35), { animate: true, duration: 0.8 })
    }
  }, [map, bounds])
  
  return null
}

function MapClickHandler({
  selectionMode,
  onPickLocation,
}: {
  selectionMode?: 'pickup' | 'drop' | null
  onPickLocation?: (coords: { lat: number; lng: number }, mode: 'pickup' | 'drop') => void
}) {
  useMapEvents({
    click(event) {
      if (!selectionMode || !onPickLocation) return
      onPickLocation({ lat: event.latlng.lat, lng: event.latlng.lng }, selectionMode)
    },
  })

  return null
}

export function LiveMap({ pickup, drop, title, subtitle, selectionMode = null, onPickLocation }: LiveMapProps) {
  const valid = isValid(pickup) && isValid(drop)
  const center: LatLngExpression = valid 
    ? [(pickup.lat + drop.lat) / 2, (pickup.lng + drop.lng) / 2]
    : [16.5062, 80.648] // Fallback to Vijayawada based on previous context
    
  const routePoints: LatLngExpression[] = valid
    ? [[pickup.lat, pickup.lng], [drop.lat, drop.lng]]
    : []

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[32px] border border-white/10 bg-black/30 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-4">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-white/48">{subtitle}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-medium text-white/72">
          Real map
        </div>
      </div>

      <div className="relative h-[360px] w-full overflow-hidden bg-[#0d1218] sm:h-[420px]">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {valid && (
            <>
              <FitBounds pickup={pickup} drop={drop} />
              <MapClickHandler selectionMode={selectionMode} onPickLocation={onPickLocation} />
              <Polyline positions={routePoints} pathOptions={{ color: '#6ee7f9', weight: 6, opacity: 0.85 }} />
              <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="leaflet-tooltip-card">
                    <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                    <span>{pickup.label}</span>
                  </div>
                </Tooltip>
              </Marker>
              <Marker position={[drop.lat, drop.lng]} icon={dropIcon}>
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="leaflet-tooltip-card">
                    <Navigation className="h-3.5 w-3.5 text-white" />
                    <span>{drop.label}</span>
                  </div>
                </Tooltip>
              </Marker>
            </>
          )}
        </MapContainer>

        {selectionMode ? (
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/12 bg-black/55 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-xl">
            Tap map to set {selectionMode}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-white/8 px-4 py-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-[22px] border border-white/8 bg-black/30 p-3 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Pickup</p>
          <p className="mt-2 truncate text-sm font-medium text-white" title={pickup.label}>{pickup.label}</p>
        </div>
        <div className="min-w-0 rounded-[22px] border border-white/8 bg-black/30 p-3 backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">Drop</p>
          <p className="mt-2 truncate text-sm font-medium text-white" title={drop.label}>{drop.label}</p>
        </div>
      </div>
    </motion.section>
  )
}
