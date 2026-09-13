import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// TODO: point this at your actual backend — use your machine's LAN IP when
// testing on a physical device via Expo Go (localhost won't resolve on-device).
// Consider pulling this from an env var (e.g. via expo-constants) instead of
// hardcoding once you have dev/staging/prod backends.
const API_BASE_URL = 'http://192.168.1.43:8000';

const TOKEN_KEY = 'art_fusion_driver_token';

export const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthenticatedUser;
  must_change_password: boolean;
}

export interface AuthenticatedUser {
  account_id: number;
  role: string;
  username: string;
  first_name: string | null;
}

/**
 * Logs a driver in against the backend and persists the JWT securely
 * on-device (SecureStore, not AsyncStorage — this is a credential).
 */
export async function loginDriver(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await authClient.post<LoginResponse>('/auth/login', {
    username,
    password,
  });

  if (!response.data.access_token) {
    throw new Error('Login succeeded, but the server did not return an access token.');
  }

  await SecureStore.setItemAsync(TOKEN_KEY, response.data.access_token);

  return response.data;
}

/** Reads the stored JWT, if any (e.g. for an app-launch auth check). */
export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/** Clears the stored JWT on logout. */
export async function logoutDriver(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Returns the current driver's profile details for an existing session. */
export async function getCurrentUser(): Promise<AuthenticatedUser> {
  const { data } = await authClient.get<AuthenticatedUser>('/auth/me');
  return data;
}

// Attaches the stored token to every outgoing request automatically,
// so screens/other API modules (gpsAPI, tripsAPI) don't need to pass it manually.
authClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
