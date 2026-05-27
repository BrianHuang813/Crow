import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { fetchMe } from '../api/projects';

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  handle: string | null;
  credits: number;
  isLoggedIn: boolean;
  login: (token: string, handle: string) => void;
  logout: () => void;
  setCredits: (credits: number) => void;
  adjustCredits: (delta: number) => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('crow_token')
  );
  const [userId, setUserId] = useState<string | null>(
    () => localStorage.getItem('crow_user_id')
  );
  const [handle, setHandle] = useState<string | null>(
    () => localStorage.getItem('crow_handle')
  );
  const [credits, setCreditsState] = useState<number>(
    () => Number(localStorage.getItem('crow_credits') ?? 0)
  );

  // Sync userId + credits from server whenever we have a token
  useEffect(() => {
    if (!token) return;
    fetchMe()
      .then(me => {
        localStorage.setItem('crow_user_id', me.id);
        localStorage.setItem('crow_credits', String(me.credits));
        setUserId(me.id);
        setCreditsState(me.credits);
      })
      .catch(() => {
        // Token expired or invalid — force logout
        logout();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback((t: string, h: string) => {
    localStorage.setItem('crow_token', t);
    localStorage.setItem('crow_handle', h);
    setToken(t);
    setHandle(h);
    // useEffect above fires on token change and calls fetchMe
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('crow_token');
    localStorage.removeItem('crow_handle');
    localStorage.removeItem('crow_credits');
    localStorage.removeItem('crow_user_id');
    setToken(null);
    setUserId(null);
    setHandle(null);
    setCreditsState(0);
  }, []);

  const setCredits = useCallback((c: number) => {
    localStorage.setItem('crow_credits', String(c));
    setCreditsState(c);
  }, []);

  const adjustCredits = useCallback((delta: number) => {
    setCreditsState(c => c + delta);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token, userId, handle, credits,
        isLoggedIn: !!token,
        login, logout, setCredits, adjustCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
