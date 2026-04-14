import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  authApi,
  type User,
  type AuthTokens,
  type RegisterPayload,
} from '../api/auth';
import { setAccessToken, setRefreshToken } from '../api/token';

// Persisted shape — only the fields we want to survive a page reload.
// Avoid persisting derived state or methods.
interface PersistedAuth {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthState extends PersistedAuth {
  // Status flags for UI
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

const STORAGE_KEY = 'dvd-lms-auth';

// Best-effort error message extraction. Avoids importing axios into this
// module so the store stays HTTP-client-agnostic.
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return (
      e.response?.data?.message ||
      e.response?.data?.error ||
      e.message ||
      fallback
    );
  }
  return fallback;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const tokens: AuthTokens = response.tokens;

          // Push tokens into the in-memory holder so the axios
          // interceptors can attach/refresh them.
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);

          set({
            user: response.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          set({
            isLoading: false,
            error: extractErrorMessage(err, 'Login failed'),
          });
          throw err;
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(payload);
          const tokens: AuthTokens = response.tokens;

          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);

          set({
            user: response.user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          set({
            isLoading: false,
            error: extractErrorMessage(err, 'Registration failed'),
          });
          throw err;
        }
      },

      logout: async () => {
        // Best-effort backend notification, then clear local state
        // regardless of the result.
        await authApi.logout();
        setAccessToken(null);
        setRefreshToken(null);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      isAuthenticated: () => !!get().accessToken && !!get().user,

      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the credentials, not the transient UI flags.
      partialize: (state): PersistedAuth => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // After rehydration on page reload, sync the in-memory token
      // holder so axios requests resume working immediately.
      onRehydrateStorage: () => (rehydratedState) => {
        if (rehydratedState?.accessToken) {
          setAccessToken(rehydratedState.accessToken);
        }
        if (rehydratedState?.refreshToken) {
          setRefreshToken(rehydratedState.refreshToken);
        }
      },
    }
  )
);
