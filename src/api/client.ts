// `same-origin` resolves to an empty base (relative URLs, same host as this
// page); unset falls back to localhost:8000 for `npm run dev` against a
// local backend. Same convention as the sibling copperbelt-marathon-site /
// event-platform-admin apps.
const rawApiBase = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  rawApiBase === 'same-origin'
    ? ''
    : rawApiBase
      ? rawApiBase.replace(/\/+$/, '')
      : 'http://localhost:8000';

export const EVENT_ID = import.meta.env.VITE_EVENT_ID || '';

const ACCESS_KEY = 'cbm-admin2-access';
const REFRESH_KEY = 'cbm-admin2-refresh';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return false;

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  localStorage.setItem(ACCESS_KEY, data.access);
  return true;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false } = options;

  async function doFetch(): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });
  }

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      errorBody?.detail || JSON.stringify(errorBody) || `Request failed (${res.status})`
    );
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// For binary downloads (e.g. Excel export) that can't go through apiFetch's
// res.json() parsing — shares the same 401-refresh-retry flow so an export
// doesn't silently fail just because the access token expired mid-session.
export async function apiFetchBlob(path: string): Promise<Blob> {
  async function doFetch(): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, { headers });
  }

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    throw new Error(`Export failed (${res.status}).`);
  }

  return res.blob();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error('Invalid email or password.');
  }

  const data = await res.json();
  setTokens(data.access, data.refresh);
  return data;
}

export { API_BASE_URL };
