import axios from 'axios';

const ORS_BASE_URL = 'https://api.openrouteservice.org';
const ORS_API_KEY = process.env.ORS_API_KEY ?? '';

/* ── Type definitions ── */
export interface RouteOption {
  coordinates: Array<{ lat: number; lng: number }>;
  distance_km: number;
  duration_minutes: number;
  traffic_delay_seconds: number;
}

export type TrafficCondition = 'CLEAR' | 'MODERATE' | 'HEAVY';

/* ── Function 1: Get Route Options ── */
export async function getRouteOptions(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<RouteOption[]> {
  try {
      const response = await axios.post(
      `${ORS_BASE_URL}/v2/directions/driving-car`,
      {
        coordinates: [
          [startLng, startLat],
          [endLng, endLat],
        ],
        geometry: true,
        instructions: false,
      },
      {
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    const data = response.data as {
      routes?: Array<{
        summary: { distance: number; duration: number };
        geometry: string;
      }>;
    };

    if (!data.routes || data.routes.length === 0) {
      return [createFallbackRoute(startLat, startLng, endLat, endLng)];
    }

    return data.routes.map((route) => {
      const coords = decodePolyline(route.geometry);
      const distanceKm = route.summary.distance / 1000;
      const durationMinutes = route.summary.duration / 60;

      // Estimate traffic delay based on speed vs expected speed
      const expectedSpeed = 30; // km/h average in Indian cities
      const expectedDuration = (distanceKm / expectedSpeed) * 60;
      const trafficDelay = Math.max(0, (durationMinutes - expectedDuration) * 60);

      return {
        coordinates: coords,
        distance_km: Math.round(distanceKm * 10) / 10,
        duration_minutes: Math.round(durationMinutes * 10) / 10,
        traffic_delay_seconds: Math.round(trafficDelay),
      };
    });
  } catch (error: unknown) {
    console.error('[routeService] getRouteOptions error:', error);
    return [createFallbackRoute(startLat, startLng, endLat, endLng)];
  }
}

/* ── Function 2: Get Traffic Condition ── */
export function getTrafficCondition(routes: RouteOption[]): TrafficCondition {
  if (routes.length === 0) return 'MODERATE';

  const primaryRoute = routes[0];
  const expectedMinutes = (primaryRoute.distance_km / 30) * 60; // 30 km/h avg
  const ratio = primaryRoute.duration_minutes / expectedMinutes;

  if (ratio < 1.2) return 'CLEAR';
  if (ratio < 1.6) return 'MODERATE';
  return 'HEAVY';
}

/* ── Helpers ── */

/**
 * Decode an encoded polyline string into lat/lng coordinate pairs.
 * ORS uses the standard Google polyline encoding by default.
 */
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const coordinates: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
}

/**
 * Create a simple straight-line fallback route when ORS is unavailable.
 */
function createFallbackRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): RouteOption {
  const R = 6371; // Earth radius in km
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLng = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((endLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c * 10) / 10;

  return {
    coordinates: [
      { lat: startLat, lng: startLng },
      { lat: endLat, lng: endLng },
    ],
    distance_km: distanceKm,
    duration_minutes: Math.round((distanceKm / 25) * 60 * 10) / 10,
    traffic_delay_seconds: 0,
  };
}
