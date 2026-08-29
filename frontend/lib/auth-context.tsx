"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type User,
} from "./api";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  // Consumed by ProtectedRoute. Logging out sets `user` to null, which would
  // otherwise trip the guard's "not signed in -> /login" redirect and beat the
  // caller's own navigation. Whoever calls logout() decides where to go next;
  // this returns true exactly once after a logout, telling the guard to stand
  // down for that render.
  consumeGuardSkip: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const skipNextGuardRedirect = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await loginUser({ email, password });
    setUser(me);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await registerUser({ name, email, password });
    },
    []
  );

  const logout = useCallback(async () => {
    await logoutUser();
    skipNextGuardRedirect.current = true;
    setUser(null);
  }, []);

  const consumeGuardSkip = useCallback(() => {
    if (!skipNextGuardRedirect.current) return false;
    skipNextGuardRedirect.current = false;
    return true;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, consumeGuardSkip, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
