import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

let browserClient: SupabaseClient<Database> | null = null;

export function isSupabaseMode(): boolean {
  if (process.env.NEXT_PUBLIC_DATA_MODE === "local") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}

function getBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return { url: url || "", key: key || "" };
}

/**
 * Browser singleton client — safe to import and invoke from any Client Component.
 * Automatically synchronizes with document.cookie and localStorage with 1-year persistence.
 */
export function getSupabaseBrowser(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;
  if (!isSupabaseMode()) return null;

  if (!browserClient) {
    const { url, key } = getBrowserEnv();
    if (!url || !key) return null;

    browserClient = createBrowserClient<Database>(url, key, {
      cookieOptions: {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        domain: "",
        path: "/",
        sameSite: "lax",
      },
    });
  }

  return browserClient;
}
