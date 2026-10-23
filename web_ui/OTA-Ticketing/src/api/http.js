const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_KEY = 'ota_ticketing_access_token';

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function saveAccessToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body != null && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Could not connect to the server. Check your connection and try again.', 0, null);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = typeof payload === 'object' && payload
      ? payload.detail || payload.error?.message || `Request failed (${response.status})`
      : payload || `Request failed (${response.status})`;
    if (response.status === 401) window.dispatchEvent(new Event('ota:unauthorized'));
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path) => request(path, { method: 'DELETE' });
