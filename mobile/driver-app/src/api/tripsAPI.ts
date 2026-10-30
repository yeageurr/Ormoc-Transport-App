// src/api/tripsAPI.ts
import { authClient } from './authAPI';

export interface Trip {
  trip_id: number;
  route_id: number;
  driver_id: number;
  vehicle_id: number;
  status: 'outgoing' | 'returning';
  time_departed: string;
  time_arrived: string | null;
  trip_duration_minutes: number | null;
  average_speed_km: number | null;
  distance_traveled_km: number | null;
  is_complete: boolean;
  pause_events: TripPauseEvent[];
}

export interface TripPauseEvent {
  pause_event_id: number;
  paused_at: string;
  resumed_at: string | null;
  delay_reason: 'accident' | 'road_incident' | 'traffic' | 'other' | null;
  delay_details: string | null;
  broadcast_to_commuters: boolean;
}

export interface TripPauseOptions {
  broadcast_to_commuters?: boolean;
  delay_reason?: TripPauseEvent['delay_reason'];
  delay_details?: string | null;
}

export interface DriverTrip extends Trip {
  vehicle_plate: string | null;
  route_label: string | null;
  route_distance_km: number | null;
}

export interface DriverDailySummary {
  trips_completed: number;
}

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

/** Starts a route-based trip leg; outgoing still requires terminal readiness. */
export async function startTrip(routeId: number, direction: Trip['status']): Promise<Trip> {
  const { data } = await authClient.post<Trip>('/trips/start', {
    route_id: routeId,
    status: direction,
  });
  return data;
}

export async function endTrip(tripId: string): Promise<Trip> {
  const { data } = await authClient.post<Trip>(`/trips/${tripId}/end`);
  return data;
}

export async function pauseTrip(tripId: string, options: TripPauseOptions = {}): Promise<TripPauseEvent> {
  const { data } = await authClient.post<TripPauseEvent>(`/trips/${tripId}/pause`, options);
  return data;
}

export async function resumeTrip(tripId: string): Promise<TripPauseEvent> {
  const { data } = await authClient.post<TripPauseEvent>(`/trips/${tripId}/resume`);
  return data;
}
