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
  /** ログイン中のユーザー。未ログインなら null */
  user: User | null;
  /** 初回の認証状態確認 (refresh) が完了しているか */
  loading: boolean;
  /** ログインしてトークン保存 + user をセットする */
  login: (email: string, password: string) => Promise<void>;
  /** 新規登録する。メール認証が必要なため即ログインはしない */
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<RegisterResult>;
  /** メール確認コードを検証する */
  verifyEmail: (token: string) => Promise<void>;
  /** 確認コードを再送する */
  resendVerification: (email: string) => Promise<{ devCode?: string }>;
  /** トークンを破棄してログアウトする */
  logout: () => void;
  /** サーバーに問い合わせて user / loading を再取得する */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** 認証状態 (user / loading) と各種認証操作を提供する Context Provider */
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

/**
 * AuthState を取得する。
 *
 * @throws AuthProvider の外で呼び出された場合
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
