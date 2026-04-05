'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { AuthSession, getSession, clearSession, isAdminSetup } from '@/lib/store';

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  adminSetup: boolean;
  refresh: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  adminSetup: false,
  refresh: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminSetup, setAdminSetup] = useState(false);

  const refresh = useCallback(() => {
    setSession(getSession());
    setAdminSetup(isAdminSetup());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, adminSetup, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
