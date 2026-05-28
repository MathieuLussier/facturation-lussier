import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@facturation/core';
import {
  login as apiLogin,
  logout as apiLogout,
  me,
  refreshDelayMs,
  refreshTokens,
  registerRefreshFn,
  setAccessToken,
} from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Contexte
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref vers performRefresh pour éviter la dépendance circulaire
  const performRefreshRef = useRef<(() => Promise<string | null>) | null>(null);

  /** Programme un re-refresh automatique avant expiration. */
  const scheduleRefresh = useCallback((expiresInSec: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const delay = refreshDelayMs(expiresInSec);
    refreshTimerRef.current = setTimeout(() => {
      void performRefreshRef.current?.();
    }, delay);
  }, []);

  /** Tente un refresh du token. Retourne le nouveau token ou null. */
  const performRefresh = useCallback(async (): Promise<string | null> => {
    const tokens = await refreshTokens();
    if (!tokens) {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
    setAccessToken(tokens.accessToken);
    scheduleRefresh(tokens.expiresInSec);
    return tokens.accessToken;
  }, [scheduleRefresh]);

  // Synchronise la ref avec la fonction courante
  performRefreshRef.current = performRefresh;

  /** Silent refresh au montage de l'app. */
  useEffect(() => {
    registerRefreshFn(performRefresh);

    const silentRefresh = async () => {
      const newToken = await performRefresh();
      if (!newToken) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const userData = await me();
        setUser(userData);
        setStatus('authenticated');
      } catch {
        setAccessToken(null);
        setUser(null);
        setStatus('unauthenticated');
      }
    };

    void silentRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [performRefresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const tokens = await apiLogin({ email, password });
      setAccessToken(tokens.accessToken);
      scheduleRefresh(tokens.expiresInSec);
      const userData = await me();
      setUser(userData);
      setStatus('authenticated');
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiLogout();
    } finally {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value: AuthContextValue = { user, status, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit etre utilise dans un AuthProvider');
  }
  return ctx;
}
