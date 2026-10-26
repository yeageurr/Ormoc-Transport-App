import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const SESSION_TOKEN_KEY = 'ota_commuter_passenger_queue_session';

export type PassengerQueueSession = {
  session_token: string;
  route_id: number;
  active: boolean;
};

type Coordinates = { latitude: number; longitude: number };

async function queueRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('Set EXPO_PUBLIC_API_URL to connect to the passenger queue.');
  const response = await fetch(`${API_URL}/public/passenger-queue${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    let message = 'Could not update the passenger queue.';
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Use the generic error if the server response is not JSON.
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function restorePassengerQueue(): Promise<PassengerQueueSession | null> {
  const token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  if (!token) return null;
  try {
    const session = await queueRequest<PassengerQueueSession>(`/current?session_token=${encodeURIComponent(token)}`);
    if (!session.active) {
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      return null;
    }
    return session;
  } catch (error: any) {
    if (error?.status === 404) await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    throw error;
  }
}

export async function joinPassengerQueue(routeId: number, coordinates: Coordinates): Promise<PassengerQueueSession> {
  const sessionToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  const session = await queueRequest<PassengerQueueSession>('', {
    method: 'POST',
    body: JSON.stringify({ route_id: routeId, ...coordinates, session_token: sessionToken }),
  });
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.session_token);
  return session;
}

export async function updatePassengerQueuePresence(coordinates: Coordinates): Promise<PassengerQueueSession | null> {
  const sessionToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  if (!sessionToken) return null;
  const session = await queueRequest<PassengerQueueSession>(`/${encodeURIComponent(sessionToken)}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify(coordinates),
  });
  if (!session.active) await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  return session;
}

export async function clearPassengerQueueSession() {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
