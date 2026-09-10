import { NextResponse } from "next/server";
import { findUser } from "@/lib/data/repository";
import { toSessionUser, cookieOptions } from "@/lib/auth";
import {
  isSupabaseMode, getSupabaseServer, resolveSupabaseUser, actorToDemoUser,
} from "@/lib/data/supabase";
import { SESSION_COOKIE } from "@/lib/constants";
import { handleApiError } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { identifier?: string; password?: string };
    const identifier = body.identifier?.trim() ?? "";
    const password = body.password ?? "";
    if (!identifier || !password) {
      return NextResponse.json({ error: "Enter phone / email and password" }, { status: 400 });
    }

    if (isSupabaseMode()) {
      const sb = await getSupabaseServer();
      // Supabase Auth only holds email credentials — resolve a phone
      // identifier to its account email first.
      let email = identifier.toLowerCase();
      if (!email.includes("@")) {
        const { data } = await sb.rpc("user_email_by_phone", { p_phone: identifier });
        email = (data ?? "").trim().toLowerCase();
        if (!email) return NextResponse.json({ error: "No account found for this number" }, { status: 401 });
      }
      const { data: signIn, error } = await sb.auth.signInWithPassword({ email, password });
      if (error || !signIn.user) {
        return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
      }
      const actor = await resolveSupabaseUser(sb, signIn.user);
      if (!actor) {
        return NextResponse.json(
          { error: "Signed in but no profile found — ask an admin to link your account." },
          { status: 500 },
        );
      }
      const user = actorToDemoUser(actor);
      const res = NextResponse.json({ user: toSessionUser(user) });
      res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
      return res;
    }

    const user = findUser(identifier, password);
    if (!user) {
      return NextResponse.json({ error: "Incorrect phone/email or password" }, { status: 401 });
    }
    const res = NextResponse.json({ user: toSessionUser(user) });
    res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
