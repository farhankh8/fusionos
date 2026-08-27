'use client';

/**
 * FusionOS Authentication Context
 *
 * Provides authentication state and actions to the entire application.
 * Uses React Context for state management.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type AuthUser,
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  setTokens,
  clearTokens,
} from '@/lib/auth-client';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<{ success: boolean; error?: string; requiresMfa?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, mfaCode?: string) => {
    const result = await authLogin(email, password, mfaCode);
    if (result.success && result.user && result.session) {
      setUser(result.user);
      setTokens(result.session.accessToken, result.session.refreshToken);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    clearTokens();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
