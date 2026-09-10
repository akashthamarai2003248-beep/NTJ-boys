import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./supabase-types";
import type { DemoUser } from "./types";

/* ─────────────────────────────────────────────────────────────
 * SUPABASE ADAPTER (Phase 3)
 *
 * The app ships in "local demo mode" by default — repository.ts
 * reads/writes the seeded local store, so no keys are required.
 *
 * To move to production Supabase (PostgreSQL + RLS):
 *   1. Copy .env.example → .env.local and fill
 *      NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   2. Run supabase/migrations (0001 → 0002 → 0003) against the
 *      project, then supabase/seed_users.sql for the demo logins
 *   3. NEXT_PUBLIC_DATA_MODE switches to "supabase" automatically
 *      once the two keys above are present.
 *
 * NEVER put a service_role key in the frontend — only the anon
 * key is safe here; server-side reads/writes go through the
 * signed-in user's JWT and are gated by RLS policies.
 * ───────────────────────────────────────────────────────────── */

export function isSupabaseMode(): boolean {
  return (
    process.env.NEXT_PUBLIC_DATA_MODE !== "local" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

function envKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env keys missing (see .env.example)");
  return { url, key };
}

/** Browser client — safe to call from client components only when mode is on. */
export function getSupabaseBrowser() {
  const { url, key } = envKeys();
  return createBrowserClient<Database>(url, key);
}

/**
 * Server client bound to the request cookie jar, so reads and writes
 * run under the signed-in user's JWT and respect RLS. Must be called
 * inside a request (route handler / server component). Each request
 * gets a fresh client — never cache one at module scope.
 */
export async function getSupabaseServer() {
  const { url, key } = envKeys();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — session refresh responses
          // are handled by the middleware/proxy when it exists.
        }
      },
    },
  });
}

/** Minimal actor shape server-side code needs about the signed-in user. */
export interface SupabaseActor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "admin" | "treasurer" | "member";
  position: string;
}

/**
 * Resolve a Supabase Auth user plus their public.users row (role /
 * position / display name). Falls back to app_metadata.role when no
 * public.users profile exists yet (invited but unprovisioned).
 */
export async function resolveSupabaseUser(
  sb: SupabaseClient<Database>,
  user: {
    id: string;
    email?: string | null;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } | null,
): Promise<SupabaseActor | null> {
  if (!user) return null;

  const appRole = user.app_metadata?.role as string | undefined;
  const metaName = user.user_metadata?.name as string | undefined;
  const metaPhone = user.user_metadata?.phone as string | null | undefined;

  const { data } = await sb.from("users").select("*").eq("id", user.id).maybeSingle();
  if (!data) {
    // Auth user without a public.users profile (e.g. invited but not
    // provisioned) — fall back to app_metadata.role so the shell can
    // still render instead of hard-failing every request.
    const metaRole = appRole ?? "member";
    const role = metaRole === "admin" || metaRole === "treasurer" ? metaRole : "member";
    return {
      id: user.id,
      name: metaName ?? user.email ?? "Member",
      email: user.email ?? null,
      phone: metaPhone ?? null,
      role,
      position: "Member",
    };
  }
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    position: data.position,
  };
}

/**
 * Resolve the signed-in Supabase user (from the request's session
 * cookies) plus their public.users row. Returns null when signed out.
 */
export async function getSupabaseUser(): Promise<SupabaseActor | null> {
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return resolveSupabaseUser(sb, user);
}

/**
 * Shape a Supabase actor into the local DemoUser the repository and
 * session helpers expect. Supabase Auth owns credentials, so the
 * plaintext password is always empty outside demo mode.
 */
export function actorToDemoUser(actor: SupabaseActor): DemoUser {
  return {
    id: actor.id,
    name: actor.name,
    phone: actor.phone ?? "",
    email: actor.email ?? "",
    password: "",
    role: actor.role,
    position: actor.position as DemoUser["position"],
  };
}
