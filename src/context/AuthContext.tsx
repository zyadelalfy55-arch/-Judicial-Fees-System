import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type SessionUser } from "../api.ts";
import { hasPermission } from "@domain/rbac.ts";
import type { Permission, RoleId } from "@domain/types.ts";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<SessionUser>;
  acceptLogin: (user: SessionUser) => void;
  register: (input: { username: string; displayName: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        const r = await api.login({ username, password });
        return r.user;
      },
      acceptLogin: setUser,
      register: async (input) => {
        const r = await api.register(input);
        setUser(r.user);
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
      can: (permission) => (user ? hasPermission(user.roles as RoleId[], permission) : false),
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider required");
  return ctx;
}
