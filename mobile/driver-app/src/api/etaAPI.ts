import { authClient } from './authAPI';

export type TripEta = {
  trip_id: number;
  eta_minutes: number | null;
  source: 'distance_speed_fallback' | 'unavailable' | string;
  remaining_distance_km: number | null;
  location_recorded_at: string | null;
};

export async function getTripEta(tripId: number): Promise<TripEta> {
  const { data } = await authClient.get<TripEta>(`/eta/trip/${tripId}`);
  return data;
}
