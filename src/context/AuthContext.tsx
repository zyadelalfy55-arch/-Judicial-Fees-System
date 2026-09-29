import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type SessionUser } from "../api.ts";
import { hasPermission } from "@domain/rbac.ts";
import type { Permission } from "@domain/types.ts";
import type { RoleId } from "@domain/types.ts";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string, courtId?: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
      login: async (username, password, courtId) => {
        const r = await api.login({ username, password, courtId });
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
