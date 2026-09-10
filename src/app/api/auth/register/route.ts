import { NextResponse } from "next/server";
import { registerUser } from "@/lib/data/repository";
import { toSessionUser, cookieOptions } from "@/lib/auth";
import {
  isSupabaseMode, getSupabaseServer, resolveSupabaseUser, actorToDemoUser,
} from "@/lib/data/supabase";
import { normalizePhone } from "@/lib/utils/id";
import { SESSION_COOKIE } from "@/lib/constants";
import { handleApiError } from "@/lib/api-helpers";

/**
 * Self-signup — new members create their own account and get the
 * `member` role immediately (view-only access until an admin
 * promotes them). Local mode stores the plaintext demo password;
 * Supabase mode uses Supabase Auth (email + password) and inserts
 * the matching public.users profile row under the new user's JWT.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      phone?: string;
      email?: string;
      password?: string;
    };
    const name = body.name?.trim() ?? "";
    const email = (body.email?.trim() ?? "").toLowerCase();
    const phone = normalizePhone(body.phone ?? "");
    const password = body.password ?? "";
    if (!name) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (phone.length < 10) return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    if (isSupabaseMode()) {
      const sb = await getSupabaseServer();
      // public.users is RLS-hidden, so probe for phone collisions via the helper
      const { data: existing } = await sb.rpc("user_email_by_phone", { p_phone: phone });
      if (existing) {
        return NextResponse.json(
          { error: "This phone number is already registered — try logging in" },
          { status: 409 },
        );
      }
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name, phone } },
      });
      if (error) {
        const msg = error.message?.toLowerCase().includes("already registered")
          ? "This email is already registered — try logging in"
          : error.message;
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (!data.user) {
        return NextResponse.json({ error: "Couldn't create the account — try again" }, { status: 400 });
      }

      const { error: insertError } = await sb
        .from("users")
        .insert({ id: data.user.id, name, phone, email, role: "member", position: "Member" });
      if (insertError) {
        const msg =
          insertError.code === "23505"
            ? "This email or phone is already registered — try logging in"
            : "Account created, but the profile couldn't be saved — contact the Mandram admin.";
        return NextResponse.json({ error: msg }, { status: 409 });
      }

      if (!data.session) {
        // Email confirmation is enabled in Supabase Auth — the user
        // must click the link before their first sign-in.
        return NextResponse.json({ needsConfirmation: true, email });
      }
      const actor = await resolveSupabaseUser(sb, data.user);
      if (!actor) {
        return NextResponse.json({ error: "Account created — sign in to continue" });
      }
      return NextResponse.json({ user: toSessionUser(actorToDemoUser(actor)) });
    }

    const user = await registerUser({ name, phone, email, password });
    const res = NextResponse.json({ user: toSessionUser(user) });
    res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}