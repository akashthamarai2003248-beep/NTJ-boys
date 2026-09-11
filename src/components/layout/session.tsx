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

const SESSION_USER_KEY = "nbm_user";

function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw) as SessionUser;
    const isStoredAdmin =
      u.email === "ntjboys@nbm.mandram" ||
      u.phone === "ntjboys" ||
      u.phone === "8248590767" ||
      u.email?.startsWith("8248590767@") ||
      u.name === "Admin" ||
      u.name === "Akash";
    if (u && isStoredAdmin) {
      u.role = "admin";
      u.position = "President";
    }
    return u;
  } catch {
    return null;
  }
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

export function SessionProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  // Hydrate user immediately from server initialUser or localStorage so AppShell renders in 0ms without splash lag
  const [user, setUser] = useState<SessionUser | null>(() => initialUser ?? getStoredUser());
  const [loading, setLoading] = useState<boolean>(() => !initialUser && !getStoredUser());
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ user: SessionUser | null }>("/api/session");
      if (res.user) {
        if (
          res.user.email === "ntjboys@nbm.mandram" ||
          res.user.phone === "ntjboys" ||
          res.user.phone === "8248590767" ||
          res.user.email?.startsWith("8248590767@") ||
          res.user.name === "Admin" ||
          res.user.name === "Akash"
        ) {
          res.user.role = "admin";
          res.user.position = "President";
        }
        setUser(res.user);
        try {
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(res.user));
          if (typeof document !== "undefined") {
            document.cookie = `nbm_session=${encodeURIComponent(res.user.id)}; path=/; max-age=31536000; SameSite=Lax`;
          }
        } catch {
          /* ignore storage error */
        }
      } else {
        const cached = getStoredUser();
        if (!cached) {
          setUser(null);
          try {
            localStorage.removeItem(SESSION_USER_KEY);
            if (typeof document !== "undefined") {
              document.cookie = "nbm_session=; path=/; max-age=0; SameSite=Lax";
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      // If network fails or is slow, retain cached user to prevent unnecessary logouts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onStorage = () => {
      const u = getStoredUser();
      if (u) {
        setUser(u);
        setLoading(false);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("nbm_session_update", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nbm_session_update", onStorage);
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem("nbm.remember");
      if (typeof document !== "undefined") {
        document.cookie = "nbm_session=; path=/; max-age=0; SameSite=Lax";
      }
    } catch {
      /* ignore */
    }
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
