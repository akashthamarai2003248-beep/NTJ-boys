"use client";

/* react-hooks/set-state-in-effect: session is fetched once on mount. */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { clearClientCache } from "@/lib/client/hooks";

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
      u.id === "d532ba34-ff29-4fcc-98c6-1b9ed6878e99" ||
      u.id === "c71a4b32-9d9c-498a-ac2d-10cde443e88d" ||
      u.id === "usr_admin";
    if (u) {
      if (isStoredAdmin) {
        u.role = "admin";
        u.position = "President";
      } else {
        u.role = "member";
      }
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

import { getSupabaseBrowser, isSupabaseMode } from "@/lib/data/supabase-browser";

export function SessionProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  // Synchronously hydrate from server initialUser or localStorage cache so there is 0ms flash
  const [user, setUser] = useState<SessionUser | null>(() => initialUser ?? getStoredUser());
  // If either initialUser or storedUser is present, we are already restored; otherwise wait for auth check
  const [loading, setLoading] = useState<boolean>(() => !initialUser && !getStoredUser());
  const router = useRouter();

  const syncUserToStorage = useCallback((u: SessionUser) => {
    try {
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(u));
      if (typeof document !== "undefined") {
        document.cookie = `nbm_session=${encodeURIComponent(u.id)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      /* ignore storage error */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ user: SessionUser | null }>("/api/session");
      if (res.user) {
        const isPrivilegedAdmin =
          res.user.email === "ntjboys@nbm.mandram" ||
          res.user.phone === "ntjboys" ||
          res.user.phone === "8248590767" ||
          res.user.email?.startsWith("8248590767@") ||
          res.user.id === "d532ba34-ff29-4fcc-98c6-1b9ed6878e99" ||
          res.user.id === "c71a4b32-9d9c-498a-ac2d-10cde443e88d" ||
          res.user.id === "usr_admin";
        if (isPrivilegedAdmin) {
          res.user.role = "admin";
          res.user.position = "President";
        } else {
          res.user.role = "member";
        }
        setUser(res.user);
        syncUserToStorage(res.user);
      } else {
        const cached = getStoredUser();
        // Only clear if no valid cached user exists in localStorage
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
  }, [syncUserToStorage]);

  // Supabase Auth lifecycle: listen via onAuthStateChange (handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
  useEffect(() => {
    if (!isSupabaseMode()) {
      if (!initialUser && !getStoredUser()) {
        load();
      } else {
        setLoading(false);
      }
      return;
    }

    const sb = getSupabaseBrowser();
    if (!sb) {
      if (!initialUser && !getStoredUser()) {
        load();
      } else {
        setLoading(false);
      }
      return;
    }

    // onAuthStateChange immediately provides INITIAL_SESSION without duplicate getSession/getUser calls
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        try {
          localStorage.removeItem(SESSION_USER_KEY);
          if (typeof document !== "undefined") {
            document.cookie = "nbm_session=; path=/; max-age=0; SameSite=Lax";
          }
        } catch {
          /* ignore */
        }
        setLoading(false);
        return;
      }

      if (event === "INITIAL_SESSION" && !session) {
        // If we have a cached user from localStorage or initialUser from SSR, keep it intact!
        const cached = getStoredUser();
        if (cached) {
          setUser(cached);
          setLoading(false);
          // Verify with server in background without blocking or destroying session
          void load();
        } else if (initialUser) {
          setUser(initialUser);
          setLoading(false);
        } else {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (session?.user) {
        // Fast path: if state or storage already has this user's profile, keep it in 0ms
        const cached = getStoredUser();
        if (cached && cached.id === session.user.id) {
          setUser(cached);
          syncUserToStorage(cached);
          setLoading(false);
          return;
        }

        // Extract metadata or fallback from auth session
        const metaName = (session.user.user_metadata?.name as string | undefined) || session.user.email?.split("@")[0] || "Member";
        const metaPhone = (session.user.user_metadata?.phone as string | undefined) || "";
        const isAdmin =
          session.user.email === "ntjboys@nbm.mandram" ||
          session.user.email?.startsWith("8248590767@") ||
          metaPhone === "8248590767" ||
          metaPhone === "ntjboys" ||
          session.user.app_metadata?.role === "admin";

        const resolvedUser: SessionUser = {
          id: session.user.id,
          name: metaName,
          phone: metaPhone,
          email: session.user.email || "",
          role: isAdmin ? "admin" : (session.user.app_metadata?.role as SessionUser["role"]) || "member",
          position: isAdmin ? "President" : "Member",
        };

        setUser(resolvedUser);
        syncUserToStorage(resolvedUser);
        setLoading(false);

        // Background profile hydration from public.users to fetch updated role/position if any
        void (async () => {
          try {
            const { data: profile } = await sb
              .from("users")
              .select("id, name, phone, email, role, position")
              .eq("id", session.user.id)
              .maybeSingle();

            if (profile) {
              const isProfileAdmin =
                profile.role === "admin" ||
                profile.email === "ntjboys@nbm.mandram" ||
                profile.phone === "8248590767" ||
                profile.phone === "ntjboys" ||
                profile.email?.startsWith("8248590767@");
              const freshUser: SessionUser = {
                id: profile.id,
                name: profile.name,
                phone: profile.phone || "",
                email: profile.email || "",
                role: isProfileAdmin ? "admin" : (profile.role as SessionUser["role"]) || "member",
                position: isProfileAdmin ? "President" : (profile.position || "Member"),
              };
              setUser(freshUser);
              syncUserToStorage(freshUser);
            }
          } catch {
            /* ignore background refresh error */
          }
        })();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [load, initialUser, syncUserToStorage]);

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
    // 1. Immediately clear client state in 0ms (optimistic instant logout)
    setUser(null);
    setLoading(false);
    try {
      localStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem("nbm.remember");
      clearClientCache();
      if (typeof document !== "undefined") {
        document.cookie = "nbm_session=; path=/; max-age=0; SameSite=Lax";
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          if (name.startsWith("sb-") || name.startsWith("nbm")) {
            document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
          }
        });
      }
    } catch {
      /* ignore */
    }

    // 2. Fire client Supabase sign out if in Supabase mode
    try {
      const sb = getSupabaseBrowser();
      if (sb) {
        void sb.auth.signOut();
      }
    } catch {
      /* ignore */
    }

    // 3. Fire backend session revocation in background
    void api.post("/api/auth/logout").catch(() => {});

    // 4. Immediately route to /login via client-side router
    router.replace("/login?logout=1");
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
