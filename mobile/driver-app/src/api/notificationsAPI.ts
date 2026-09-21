import { authClient } from './authAPI';

export interface DriverNotification {
  notification_id: number;
  notification_type: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getMyNotifications(): Promise<DriverNotification[]> {
  const { data } = await authClient.get<DriverNotification[]>('/notifications/mine');
  return data;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await authClient.patch(`/notifications/${notificationId}/read`);
}
