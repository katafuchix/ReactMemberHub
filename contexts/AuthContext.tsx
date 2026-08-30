import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken, type User } from '../lib/api';

interface RegisterResult {
  needsVerification: true;
  email: string;
  devCode?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<RegisterResult>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ devCode?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ token: string; user: User }>(
      '/auth/login',
      { email, password },
    );
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
    ): Promise<RegisterResult> => {
      const { data } = await api.post<RegisterResult>('/auth/register', {
        email,
        password,
        displayName,
      });
      // 認証が済むまではログインさせない
      return data;
    },
    [],
  );

  const verifyEmail = useCallback(async (token: string) => {
    await api.post('/auth/verify-email', { token });
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const { data } = await api.post<{ devCode?: string }>(
      '/auth/resend-verification',
      { email },
    );
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      verifyEmail,
      resendVerification,
      logout,
      refresh,
    }),
    [
      user,
      loading,
      login,
      register,
      verifyEmail,
      resendVerification,
      logout,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
