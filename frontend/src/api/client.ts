import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken } from './token';

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
// Response interceptor: on 401, attempt a transparent token refresh using
// the refresh token. If refresh succeeds, retry the original request.
// If refresh fails, clear auth and let the caller handle the error.
// ---------------------------------------------------------------------------

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(token: string | null, error: unknown = null) {
  for (const { resolve, reject } of refreshQueue) {
    if (token) resolve(token);
    else reject(error);
  }
  refreshQueue = [];
}

function clearAuth() {
  setAccessToken(null);
  setRefreshToken(null);
  try {
    localStorage.removeItem('dvd-lms-auth');
  } catch {
    // localStorage may be unavailable
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh the refresh call itself
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuth();
      return Promise.reject(error);
    }

    const currentRefreshToken = getRefreshToken();
    if (!currentRefreshToken) {
      clearAuth();
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._retry = true;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      // Use plain axios (not apiClient) to avoid interceptor loop
      const { data } = await axios.post(`${baseURL}/auth/refresh`, {
        refreshToken: currentRefreshToken,
      });

      const newAccessToken = data.tokens?.accessToken;
      const newRefreshToken = data.tokens?.refreshToken;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      setAccessToken(newAccessToken);
      if (newRefreshToken) setRefreshToken(newRefreshToken);

      // Update persisted store
      try {
        const stored = localStorage.getItem('dvd-lms-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.state.accessToken = newAccessToken;
          if (newRefreshToken) parsed.state.refreshToken = newRefreshToken;
          localStorage.setItem('dvd-lms-auth', JSON.stringify(parsed));
        }
      } catch {
        // non-critical
      }

      processQueue(newAccessToken);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(null, refreshError);
      clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
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
