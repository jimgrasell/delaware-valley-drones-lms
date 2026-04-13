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

// Backend's POST /auth/register returns the same shape as login (user
// plus tokens) — successful registration is auto-logged-in.
type RegisterResponse = LoginResponse;

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
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

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await apiClient.post<RegisterResponse>(
      '/auth/register',
      payload
    );
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

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ success: boolean; message: string }>(
      '/auth/forgot-password',
      { email }
    );
    return data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const { data } = await apiClient.put<{ success: boolean; message: string }>(
      '/auth/reset-password',
      { token, newPassword }
    );
    return data;
  },

  updateProfile: async (profile: {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    bio?: string | null;
  }): Promise<User> => {
    const { data } = await apiClient.put<{ success: boolean; user: User }>(
      '/auth/profile',
      profile
    );
    return data.user;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const { data } = await apiClient.put<{ success: boolean; message: string }>(
      '/auth/change-password',
      { currentPassword, newPassword }
    );
    return data;
  },
};
