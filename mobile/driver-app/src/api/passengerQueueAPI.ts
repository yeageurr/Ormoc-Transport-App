import { authClient } from './authAPI';

type PassengerQueueCountResponse = {
  route_id: number | null;
  count: number;
};

export async function getPassengerQueueCount(): Promise<number> {
  const { data } = await authClient.get<PassengerQueueCountResponse>('/public/passenger-queue/driver/count');
  return data.count;
}
