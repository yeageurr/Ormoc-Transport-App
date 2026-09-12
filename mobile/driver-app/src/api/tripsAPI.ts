// src/api/tripsAPI.ts
import { authClient } from './authAPI';

export interface Trip {
  trip_id: number;
  dispatch_id: number;
  status: 'outgoing' | 'returning';
  time_departed: string;
  time_arrived: string | null;
  trip_duration_minutes: number | null;
  average_speed_km: number | null;
  is_complete: boolean;
}

export interface DriverTrip extends Trip {
  vehicle_plate: string | null;
  route_label: string | null;
}

export interface DriverDailySummary {
  trips_completed: number;
  incidents_reported: number;
}

export interface RecordTripPayload {
  routeId: string;
  vehiclePlate?: string;
  notes?: string;
}

export interface IncidentReport {
  tripId?: string;
  type: string;
  description: string;
  latitude?: number;
  longitude?: number;
  occurredAt: string; // ISO 8601
}

/**
 * ASSUMPTION — NOT YET VERIFIED against the real backend router.
 *
 * No dedicated incidentAPI.ts exists in the confirmed src/api/
 * structure, so reportIncident() lives here for now, backing
 * ReportIncidentScreen.tsx. If the backend treats incidents as a
 * fully separate resource, split this into its own incidentAPI.ts.
 */

/** Returns only the signed-in driver's trips, newest first. */
export async function getTripLogs(): Promise<DriverTrip[]> {
  const { data } = await authClient.get<DriverTrip[]>('/trips/driver/mine');
  return data;
}

/** Returns today's signed-in driver activity in Philippine time. */
export async function getDailySummary(): Promise<DriverDailySummary> {
  const { data } = await authClient.get<DriverDailySummary>('/trips/driver/summary');
  return data;
}

export async function getTripDetail(tripId: string): Promise<Trip> {
  const { data } = await authClient.get<Trip>(`/trips/${tripId}`);
  return data;
}

export async function recordTrip(payload: RecordTripPayload): Promise<Trip> {
  const { data } = await authClient.post<Trip>('/trips', {
    route_id: payload.routeId,
    vehicle_plate: payload.vehiclePlate,
    notes: payload.notes,
  });
  return data;
}

export async function endTrip(tripId: string): Promise<Trip> {
  const { data } = await authClient.post<Trip>(`/trips/${tripId}/end`);
  return data;
}

export async function reportIncident(report: IncidentReport): Promise<void> {
  await authClient.post('/incidents', {
    trip_id: report.tripId,
    type: report.type,
    description: report.description,
    latitude: report.latitude,
    longitude: report.longitude,
    occurred_at: report.occurredAt,
  });
}
