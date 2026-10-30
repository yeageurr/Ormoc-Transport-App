export type RouteGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

export type CommuterRoute = {
  route_id: number;
  origin_name: string;
  destination_name: string;
  distance_km: number;
  average_travel_duration_minutes: number | null;
  route_geometry: RouteGeometry | null;
};

export type CommuterVehicle = {
  vehicle_id: number;
  plate_number: string;
  body_number: string;
  body_color: string;
  vehicle_type: string;
  route_id: number | null;
  route_label: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  recorded_at: string;
};

export type TerminalGeofence = {
  terminal_name: string;
  min_latitude: number;
  min_longitude: number;
  max_latitude: number;
  max_longitude: number;
};

export type CommuterDelayNotice = {
  trip_id: number;
  route_id: number;
  route_name: string;
  direction: 'outgoing' | 'returning';
  paused_at: string;
  resumed_at: string | null;
  reason: string;
  details: string | null;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

async function getPublicData<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error('Set EXPO_PUBLIC_API_URL to connect to live commuter data.');
  const response = await fetch(`${API_URL}/public${path}`);
  if (!response.ok) throw new Error(`Could not load live map data (${response.status}).`);
  return response.json() as Promise<T>;
}

export const getCommuterRoutes = () => getPublicData<CommuterRoute[]>('/routes');
export const getLiveCommuterVehicles = () => getPublicData<CommuterVehicle[]>('/vehicles/live');
export const getTerminalGeofence = () => getPublicData<TerminalGeofence>('/terminal-geofence');
export const getActiveDelayNotices = () => getPublicData<CommuterDelayNotice[]>('/delay-notices');
