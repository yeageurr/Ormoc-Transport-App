import { authClient } from './authAPI';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export type DriverRouteGeometry = RouteGeometry;

export interface DriverRoute {
  route_id: number;
  destination: { name: string } | null;
  distance: number;
  average_travel_duration: number | null;
  route_geometry: DriverRouteGeometry | null;
}

export interface DriverVehicleStatus {
  vehicle_id: number;
  plate_number: string;
  activity_status: 'active' | 'loading' | 'on-route' | string;
}

export async function getDriverRoutes(): Promise<DriverRoute[]> {
  const { data } = await authClient.get<DriverRoute[]>('/routes');
  return data;
}

export async function getMyDriverVehicle(): Promise<DriverVehicleStatus | null> {
  try {
    const { data } = await authClient.get<DriverVehicleStatus>('/vehicles/driver/mine');
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}
