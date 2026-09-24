import { authClient } from './authAPI';

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface CurrentDispatch {
  dispatch_id: number;
  route_id: number;
  vehicle_plate: string;
  route_label: string;
  route_geometry: RouteGeometry | null;
}

export async function getCurrentDispatch(): Promise<CurrentDispatch | null> {
  try {
    const { data } = await authClient.get<CurrentDispatch>('/dispatch/driver/current');
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}
