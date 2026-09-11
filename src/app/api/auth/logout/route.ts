import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isSupabaseMode, getSupabaseServer } from "@/lib/data/supabase";
import { SESSION_COOKIE } from "@/lib/constants";
import { invalidateSessionUser } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const currentId = cookieStore.get(SESSION_COOKIE)?.value;
  invalidateSessionUser(currentId);
  if (isSupabaseMode()) {
    try {
      const sb = await getSupabaseServer();
      await Promise.race([
        sb.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    } catch {
      // No active Supabase session — nothing to revoke server-side.
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith("sb-") || c.name.startsWith("nbm")) {
      res.cookies.set(c.name, "", { path: "/", maxAge: 0, sameSite: "lax" });
      try {
        cookieStore.delete(c.name);
      } catch {
        /* ignore */
      }
    }
  }
  return res;
}
