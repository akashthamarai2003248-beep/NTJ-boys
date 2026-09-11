import { cookies } from "next/headers";
import type { AppRole, DemoUser } from "./data/types";
import { getUserById, HttpError } from "./data/repository";
import {
  isSupabaseMode, getSupabaseUser, getSupabaseServer, actorToDemoUser,
} from "./data/supabase";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./constants";

/* Server-only session helpers. DEMO auth (local mode) stores the
 * user id in a cookie; Supabase Auth (Phase 3) validates the session
 * JWT via @supabase/ssr and reads the role from public.users. Both
 * resolve to the same SessionUser shape, so routes don't branch. */

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: AppRole;
  position: string;
}

export function toSessionUser(u: DemoUser): SessionUser {
  return { id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, position: u.position };
}

export async function getSessionUser(): Promise<DemoUser | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;

  if (isSupabaseMode()) {
    // Fast-path: If user has persistent session cookie
    if (id) {
      if (id.startsWith("usr-")) {
        const local = getUserById(id);
        if (local) return local;
      }
      try {
        const sb = await getSupabaseServer();
        const { data: profile } = await sb.from("users").select("*").eq("id", id).maybeSingle();
        if (profile) {
          const isAdmin =
            profile.email === "ntjboys@nbm.mandram" ||
            profile.phone === "8248590767" ||
            profile.phone === "ntjboys" ||
            profile.email?.startsWith("8248590767@") ||
            profile.role === "admin" ||
            id === "d532ba34-ff29-4fcc-98c6-1b9ed6878e99" ||
            id === "c71a4b32-9d9c-498a-ac2d-10cde443e88d" ||
            id === "usr_admin";
          return {
            id: profile.id,
            name: profile.name,
            phone: profile.phone ?? "",
            email: profile.email ?? "",
            password: "",
            role: isAdmin ? "admin" : profile.role,
            position: (isAdmin ? "President" : (profile.position || "Member")) as DemoUser["position"],
          };
        }
      } catch {
        /* ignore and fallback to Supabase auth check */
      }
    }

    try {
      const actor = await getSupabaseUser();
      if (actor) {
        const isAdmin =
          actor.email === "ntjboys@nbm.mandram" ||
          actor.phone === "8248590767" ||
          actor.phone === "ntjboys" ||
          actor.email?.startsWith("8248590767@") ||
          actor.role === "admin" ||
          actor.id === "d532ba34-ff29-4fcc-98c6-1b9ed6878e99" ||
          actor.id === "c71a4b32-9d9c-498a-ac2d-10cde443e88d" ||
          actor.id === "usr_admin";
        if (isAdmin) {
          actor.role = "admin";
          actor.position = "President";
        }
        return actorToDemoUser(actor);
      }
    } catch {
      /* ignore */
    }

    // Final fallback: check local store in case demo session
    if (id) {
      const local = getUserById(id);
      if (local) return local;
    }

    return null;
  }

  if (!id) return null;
  return getUserById(id);
}

/** Throw 401 when not signed in, 403 when role insufficient. */
export async function requireUser(roles?: AppRole[]): Promise<DemoUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Please sign in to continue");
  if (roles && roles.length && !roles.includes(user.role)) {
    throw new HttpError(403, "You do not have permission for this action");
  }
  return user;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Only enforce secure cookie when explicitly on HTTPS or when VERCEL is present, preventing dropped cookies on HTTP/LAN
  secure: process.env.NODE_ENV === "production" && (process.env.VERCEL === "1" || Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https"))),
  path: "/",
  maxAge: SESSION_MAX_AGE,
  expires: new Date(Date.now() + SESSION_MAX_AGE * 1000),
};
