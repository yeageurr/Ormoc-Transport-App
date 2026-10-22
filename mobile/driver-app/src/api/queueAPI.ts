import { authClient } from './authAPI';

export interface DriverReservation {
  id: number;
  route_id: number;
  vehicle_id: number;
  operating_date: string;
  queue_number: number | null;
  queue_display: string | null;
  approval_status: 'pending' | 'approved' | 'cancelled' | 'expired';
  queue_status: 'on_queue' | 'loading' | 'departed' | null;
  reserved_at: string;
  approved_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  ticket_id: string | null;
  ticket_reference: string | null;
  ticket_is_valid: boolean | null;
}

export interface DriverReservationHistory extends DriverReservation {
  driver_name: string;
  route_label: string;
  vehicle_plate: string;
  vehicle_body_number: string;
  loading_at: string | null;
  departed_at: string | null;
  ticket_created_at: string | null;
  ticket_used_at: string | null;
  ticket_cancelled_at: string | null;
  ticket_expired_at: string | null;
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

/** Returns the signed-in driver's complete reservation and ticket history. */
export async function getDriverReservationHistory(): Promise<DriverReservationHistory[]> {
  const { data } = await authClient.get<DriverReservationHistory[]>('/queue-reservations/driver/mine');
  return data;
}
