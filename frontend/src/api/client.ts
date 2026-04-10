import axios, { AxiosError } from 'axios';
import { getAccessToken, setAccessToken } from './token';

// VITE_API_URL is set per-environment:
//   - local dev: leave unset (or "/api/v1") and Vite proxies /api to the
//     backend on port 3000 (see vite.config.ts)
//   - production: set on the static-site component to your backend URL,
//     e.g. https://delaware-valley-drones-lms-app-u8wzb.ondigitalocean.app/api/v1
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // JWTs flow as Authorization: Bearer <token>, not cookies, so we don't
  // need credentials on cross-origin requests.
  withCredentials: false,
});

// ---------------------------------------------------------------------------
// Request interceptor: attach the bearer token to every request when one
// is set. The token comes from the in-memory token holder, which is kept
// in sync by the auth store on login/logout/rehydrate.
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor: on 401, clear local auth state and let the caller
// see the error. Components can render an error message and redirect.
//
// We don't try to refresh the token here yet — that's a future iteration.
// Default access token lifetime on the backend is 24h, so it's not urgent.
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setAccessToken(null);
      // Best-effort: nudge any persisted auth state. We can't import the
      // store here (circular), so the LoginPage / route guards in callers
      // are responsible for redirecting.
      try {
        localStorage.removeItem('dvd-lms-auth');
      } catch {
        // localStorage may be unavailable in some environments
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Helper: extract a human-readable error message from any axios error.
// Backend errors come back as { error, message, status } per the
// AppError shape in backend/src/middleware/errorHandler.ts.
// ---------------------------------------------------------------------------
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; error?: string }
      | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}
