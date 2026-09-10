import { NextResponse } from "next/server";
import { isSupabaseMode, getSupabaseServer } from "@/lib/data/supabase";
import { SESSION_COOKIE } from "@/lib/constants";

export async function POST() {
  if (isSupabaseMode()) {
    try {
      const sb = await getSupabaseServer();
      await sb.auth.signOut();
    } catch {
      // No active Supabase session — nothing to revoke server-side.
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  return res;
}
