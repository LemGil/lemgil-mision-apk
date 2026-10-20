import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';

const AUTH_EMAIL = import.meta.env.VITE_SUPABASE_EMAIL || 'admin@lemgil.app';

interface AuthContextValue {
  session: string | null;
  loading: boolean;
  error: string;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) setSession(s.access_token);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (pin: string): Promise<boolean> => {
    setError('');
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: AUTH_EMAIL,
        password: pin,
      });
      if (err || !data.session) {
        setError('PIN incorrecto');
        return false;
      }
      setSession(data.session.access_token);
      return true;
    } catch {
      setError('Sin conexión — verifica tu internet para el primer acceso');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
