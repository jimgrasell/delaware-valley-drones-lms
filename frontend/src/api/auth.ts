import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types — match the backend's User model and AuthService response shapes.
// ---------------------------------------------------------------------------

export type UserRole = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  isBlocked: boolean;
  phone?: string | null;
  bio?: string | null;
  profilePhotoUrl?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  tokens: AuthTokens;
}

interface MeResponse {
  success: boolean;
  user: User;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  me: async (): Promise<MeResponse> => {
    const { data } = await apiClient.get<MeResponse>('/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    // Backend logout is a no-op (no server-side token blacklist), but
    // calling it lets the backend log the event. Best-effort: don't block
    // local logout if the request fails.
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    }
  },
};
