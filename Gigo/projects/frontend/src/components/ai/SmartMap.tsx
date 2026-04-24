import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Loader2, Navigation, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { useX402 } from '../../hooks/useX402';
import { cn } from '../../lib/cn';
import type { RideLocation } from '../../types/ride';

/* ── Types ── */
interface SmartRouteResponse {
  success: boolean;
  route: {
    waypoints: Array<{ lat: number; lng: number }>;
    estimated_minutes: number;
    distance_km: number;
    traffic_status: 'CLEAR' | 'MODERATE' | 'HEAVY';
    reason: string;
  };
}

interface SmartMapProps {
  pickup: RideLocation;
  destination: RideLocation;
}

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
  });
}

const pickupPin = makePinIcon('#10b981', 'A');
const dropPin = makePinIcon('#3b82f6', 'B');

/* ── Auto-fit bounds ── */
function FitBounds({ waypoints }: { waypoints: LatLngExpression[] }) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    if (waypoints.length < 2) return;
    const key = JSON.stringify(waypoints.slice(0, 2));
    if (prevKey.current === key) return;
    prevKey.current = key;

    const bounds = L.latLngBounds(waypoints as L.LatLngExpression[]);
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.4), { animate: true, duration: 1 });
    }
  }, [waypoints, map]);

  return null;
}

/* ── Traffic badge config ── */
const trafficConfig = {
  CLEAR: {
    emoji: '🟢',
    label: 'Clear Traffic',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  MODERATE: {
    emoji: '🟡',
    label: 'Moderate Traffic',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  HEAVY: {
    emoji: '🔴',
    label: 'Heavy Traffic',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/20',
    text: 'text-rose-400',
  },
};

/* ── Component ── */
export function SmartMap({ pickup, destination }: SmartMapProps) {
  const { callX402API, isWalletReady } = useX402();
  const [waypoints, setWaypoints] = useState<LatLngExpression[]>([]);
  const [routeInfo, setRouteInfo] = useState<{
    estimated_minutes: number;
    distance_km: number;
    traffic_status: 'CLEAR' | 'MODERATE' | 'HEAVY';
    reason: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevKey = useRef('');

  const fetchSmartRoute = useCallback(async () => {
    if (!pickup.lat || !destination.lat || !isWalletReady) return;

    const key = `${pickup.lat},${pickup.lng},${destination.lat},${destination.lng}`;
    if (prevKey.current === key && routeInfo) return;
    prevKey.current = key;

    setIsLoading(true);
    setError(null);

    try {
      const data = await callX402API<SmartRouteResponse>('/api/smart-route', {
        start: { lat: pickup.lat, lng: pickup.lng },
        end: { lat: destination.lat, lng: destination.lng },
      });

      const latLngs: LatLngExpression[] = data.route.waypoints.map((wp) => [wp.lat, wp.lng]);
      setWaypoints(latLngs);
      setRouteInfo({
        estimated_minutes: data.route.estimated_minutes,
        distance_km: data.route.distance_km,
        traffic_status: data.route.traffic_status,
        reason: data.route.reason,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Route analysis failed');
      // Fallback: straight line
      setWaypoints([
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng],
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [pickup, destination, isWalletReady, callX402API, routeInfo]);

  // Re-fetch when coordinates change
  useEffect(() => {
    const key = `${pickup.lat},${pickup.lng},${destination.lat},${destination.lng}`;
    if (key !== prevKey.current) {
      prevKey.current = '';
      setRouteInfo(null);
      setWaypoints([]);
    }
  }, [pickup, destination]);

  const center: LatLngExpression =
    pickup.lat !== 0 ? [pickup.lat, pickup.lng] : [12.9716, 77.5946];

  const fallbackRoute: LatLngExpression[] =
    waypoints.length > 1
      ? waypoints
      : [
          [pickup.lat || 12.9716, pickup.lng || 77.5946],
          [destination.lat || 12.9352, destination.lng || 77.6245],
        ];

  const traffic = routeInfo ? trafficConfig[routeInfo.traffic_status] : null;

  return (
    <div className="relative h-full w-full">
      {/* Leaflet map */}
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        zoomControl={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#0d1117',
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <FitBounds waypoints={fallbackRoute} />

        {/* Route polyline */}
        {fallbackRoute.length > 1 && (
          <>
            <Polyline positions={fallbackRoute} pathOptions={{ color: '#38bdf8', weight: 14, opacity: 0.12 }} />
            <Polyline positions={fallbackRoute} pathOptions={{ color: '#38bdf8', weight: 5, opacity: 1 }} />
            <Polyline positions={fallbackRoute} pathOptions={{ color: '#fff', weight: 2, opacity: 0.3, dashArray: '8 12' }} />
          </>
        )}

        {/* Markers */}
        {pickup.lat !== 0 && <Marker position={[pickup.lat, pickup.lng]} icon={pickupPin} />}
        {destination.lat !== 0 && destination.lat !== pickup.lat && (
          <Marker position={[destination.lat, destination.lng]} icon={dropPin} />
        )}
      </MapContainer>

      {/* ── Overlay: Smart Route button ── */}
      {!routeInfo && !isLoading && (
        <div className="absolute left-3 top-3" style={{ zIndex: 900 }}>
          <button
            type="button"
            onClick={() => void fetchSmartRoute()}
            disabled={!isWalletReady || !pickup.lat || !destination.lat}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold backdrop-blur-xl transition',
              'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white',
              'border border-white/10 shadow-[0_4px_24px_rgba(99,102,241,0.3)]',
              'hover:shadow-[0_4px_32px_rgba(99,102,241,0.5)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Navigation className="h-3.5 w-3.5" />
            AI Smart Route
          </button>
        </div>
      )}

      {/* ── Overlay: Loading ── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[800] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-8 py-6 backdrop-blur-xl">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              <p className="text-sm font-medium text-white/60">AI finding best route…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay: Traffic badge (top-right) ── */}
      {traffic && routeInfo && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-3 top-3"
          style={{ zIndex: 900 }}
        >
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-xl',
              traffic.bg,
              traffic.border,
            )}
          >
            <span className="text-base">{traffic.emoji}</span>
            <span className={cn('text-xs font-semibold', traffic.text)}>
              {traffic.label}
            </span>
          </div>
        </motion.div>
      )}

      {/* ── Overlay: ETA badge (bottom-left) ── */}
      {routeInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3"
          style={{ zIndex: 900 }}
        >
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-white/40" />
              <span className="text-sm font-semibold text-white">
                ~{Math.round(routeInfo.estimated_minutes)} mins
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-white/40">
              {routeInfo.distance_km} km
            </span>
            <button
              type="button"
              onClick={() => {
                prevKey.current = '';
                void fetchSmartRoute();
              }}
              className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white/60"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Overlay: Heavy traffic warning banner ── */}
      <AnimatePresence>
        {routeInfo?.traffic_status === 'HEAVY' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-3 right-3 top-16"
            style={{ zIndex: 900 }}
          >
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 backdrop-blur-xl">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs font-medium text-amber-300">
                ⚠️ Traffic detected! AI found faster route
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Overlay: Error state ── */}
      {error && (
        <div className="absolute bottom-3 right-3" style={{ zIndex: 900 }}>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 backdrop-blur-xl">
            <p className="text-[10px] font-medium text-rose-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
