// src/api/gpsAPI.ts
import { authClient } from './authAPI';

export interface TripGpsLog {
  gps_log_id: number;
  trip_id: number;
  latitude: number;
  longitude: number;
  recorded_at: string;
  speed_kmh: number;
}

export interface GpsPing {
  latitude: number;
  longitude: number;
  heading?: number;
  speedKph?: number;
  timestamp: string; // ISO 8601
}

export interface GpsSession {
  sessionId: string;
  tripId: string;
  startedAt: string;
}

/** Updates the admin Live Map with this driver's latest foreground fix. */
export async function updateCurrentLocation(ping: {
  latitude: number;
  longitude: number;
  speedKph?: number;
}): Promise<void> {
  await authClient.post('/gps/current', {
    latitude: ping.latitude,
    longitude: ping.longitude,
    speed_kmh: ping.speedKph ?? 0,
  });
}

/** Persists a location sample against an active trip for its trip history. */
export async function logTripGpsPing(tripId: number, ping: {
  latitude: number;
  longitude: number;
  speedKph?: number | null;
}): Promise<void> {
  await authClient.post('/gps', {
    trip_id: tripId,
    latitude: ping.latitude,
    longitude: ping.longitude,
    speed_kmh: Math.max(0, ping.speedKph ?? 0),
  });
}

/** Returns the ordered location samples saved for a driver's trip. */
export async function getTripGpsLogs(tripId: number): Promise<TripGpsLog[]> {
  const { data } = await authClient.get<TripGpsLog[]>(`/gps/trip/${tripId}`);
  return data;
}

/** Sends an idle vehicle's position so the backend can detect terminal loading. */
export interface GeofencePingResult {
  currently_inside?: boolean;
  status_changed?: boolean;
  event?: string;
  vehicle_status?: string;
  elapsed_seconds?: number;
  remaining_seconds?: number;
  dwell_threshold_seconds?: number;
}

export async function pingGeofence(ping: {
  latitude: number;
  longitude: number;
}): Promise<GeofencePingResult> {
  const { data } = await authClient.post<GeofencePingResult>('/geofence/ping', ping);
  return data;
}

/**
 * ASSUMPTION — NOT YET VERIFIED against the real backend router (same
 * caveat as authAPI.ts's /auth/login guess). Endpoint paths and body
 * shape below are inferred, not confirmed.
 *
 * Design assumption: live position streaming happens over the WebSocket
 * connection (useWebsocket.ts / ws_router.py), not here. This REST
 * client only covers:
 *   1. session bookkeeping (start/end a GPS session tied to a trip)
 *   2. a fallback ping path for when the socket drops
 * If live tracking is meant to be REST-polling instead of WS, this file
 * needs to change shape (e.g. sendGpsPingFallback becomes the primary path).
 */

export async function startGpsSession(tripId: string): Promise<GpsSession> {
  const { data } = await authClient.post<GpsSession>('/gps/start', {
    trip_id: tripId,
  });
  return data;
}

export async function endGpsSession(sessionId: string): Promise<void> {
  await authClient.post(`/gps/${sessionId}/end`);
}

export async function sendGpsPingFallback(
  sessionId: string,
  ping: GpsPing
): Promise<void> {
  await authClient.post(`/gps/${sessionId}/ping`, {
    latitude: ping.latitude,
    longitude: ping.longitude,
    heading: ping.heading,
    speed_kph: ping.speedKph,
    timestamp: ping.timestamp,
  });
}

export async function getActiveGpsSession(): Promise<GpsSession | null> {
  try {
    const { data } = await authClient.get<GpsSession>('/gps/active');
    return data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}
