import { authClient } from './authAPI';

export interface DriverReservation {
  id: number;
  route_id: number;
  vehicle_id: number;
  operating_date: string;
  queue_number: number | null;
  queue_display: string | null;
  approval_status: 'pending' | 'approved' | 'cancelled';
  queue_status: 'on_queue' | 'loading' | 'departed' | null;
  reserved_at: string;
  approved_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  ticket_id: string | null;
  ticket_reference: string | null;
  ticket_is_valid: boolean | null;
}

/** Returns the driver's pending or currently active reservation, if one exists. */
export async function getCurrentDriverReservation(): Promise<DriverReservation | null> {
  try {
    const { data } = await authClient.get<DriverReservation>('/queue-reservations/driver/current');
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}
