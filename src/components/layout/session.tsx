"use client";

/* react-hooks/set-state-in-effect: session is fetched once on mount. */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: "admin" | "treasurer" | "member";
  position: string;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState>({
  user: null,
  loading: true,
  refresh: () => {},
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ user: SessionUser | null }>("/api/session");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    router.replace("/login");
    router.refresh();
  }, [router]);

  return (
    <SessionContext.Provider value={{ user, loading, refresh: load, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

/** Role-based capability flags used across the UI. */
export function usePermissions() {
  const { user } = useSession();
  const role = user?.role ?? "member";
  return {
    user,
    role,
    can: {
      finances: role === "admin" || role === "treasurer",
      events: role === "admin",
      members: role === "admin",
      settings: role === "admin",
    },
    viewer: role === "member",
  };
}
