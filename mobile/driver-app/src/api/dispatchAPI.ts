import { authClient } from './authAPI';

export interface CurrentDispatch {
  dispatch_id: number;
  vehicle_plate: string;
  route_label: string;
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
