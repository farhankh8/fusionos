/**
 * FusionOS Frontend Authentication Client
 *
 * Handles authentication state, token management, and API calls.
 * Tokens are stored in memory (not localStorage) for security.
 * Refresh tokens are managed via HttpOnly cookies by the server.
 */

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3001';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  session?: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
  };
  requiresMfa?: boolean;
  error?: string;
}

// ── Token Storage (in-memory only) ───────────────────────────────────────────

let currentAccessToken: string | null = null;
let currentRefreshToken: string | null = null;

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  currentAccessToken = accessToken;
  currentRefreshToken = refreshToken;
}

export function clearTokens(): void {
  currentAccessToken = null;
  currentRefreshToken = null;
}

// ── API Calls ────────────────────────────────────────────────────────────────

async function apiCall<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add access token if available
  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token expiration — attempt refresh
  if (response.status === 401 && currentRefreshToken) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry the original request with new token
      headers['Authorization'] = `Bearer ${currentAccessToken}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ error: { message: 'Request failed' } }));
        throw new Error(error.error?.message ?? 'Request failed');
      }
      return retryResponse.json();
    }
    // Refresh failed — clear tokens and throw
    clearTokens();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error.error?.message ?? 'Request failed');
  }

  return response.json();
}

// ── Token Refresh ────────────────────────────────────────────────────────────

async function attemptTokenRefresh(): Promise<boolean> {
  if (!currentRefreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ── Auth Actions ─────────────────────────────────────────────────────────────

export async function login(email: string, password: string, mfaCode?: string): Promise<LoginResult> {
  try {
    const data = await apiCall<{
      user?: AuthUser;
      session?: { accessToken: string; refreshToken: string; accessTokenExpiresAt: string };
      requiresMfa?: boolean;
      message?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, mfaCode }),
    });

    if (data.requiresMfa) {
      return { success: false, requiresMfa: true, error: 'MFA code required' };
    }

    if (data.user && data.session) {
      setTokens(data.session.accessToken, data.session.refreshToken);
      return { success: true, user: data.user, session: data.session };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

export async function logout(): Promise<void> {
  try {
    await apiCall('/auth/logout', { method: 'POST' });
  } finally {
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    if (!currentAccessToken) return null;
    const data = await apiCall<AuthUser>('/auth/me');
    return data;
  } catch {
    clearTokens();
    return null;
  }
}

export async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Reset failed',
    };
  }
}
