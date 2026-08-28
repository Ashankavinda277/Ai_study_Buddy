"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

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
  loggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Pages ProtectedRoute never guards -- once we land on one of these after
// logout, the redirect race is over and it's safe to re-arm the guard.
const PUBLIC_PATHS = ["/", "/login", "/register"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (loggingOut && PUBLIC_PATHS.includes(pathname)) {
      setLoggingOut(false);
    }
  }, [loggingOut, pathname]);

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
    setLoggingOut(true);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loggingOut, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
