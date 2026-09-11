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
    const phone = normalizePhone(body.phone ?? "");
    if (body.email?.trim() && !body.email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    const email = (body.email?.trim() || `${phone}@nbm.mandram`).toLowerCase();
    const password = body.password ?? "";
    if (!name) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
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
          ? "This phone number is already registered — try logging in"
          : error.message;
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (!data.user) {
        return NextResponse.json({ error: "Couldn't create the account — try again" }, { status: 400 });
      }

      // Save profile to public.users:
      // 1. Try the security definer RPC helper (bypasses RLS safely)
      const { error: rpcError } = await sb.rpc("create_user_profile", {
        p_id: data.user.id,
        p_name: name,
        p_phone: phone,
        p_email: email,
      });

      // 2. If RPC is not available yet, fall back to direct insert
      if (rpcError) {
        const { error: insertError } = await sb
          .from("users")
          .insert({ id: data.user.id, name, phone, email, role: "member", position: "Member" });

        // Error code 23505 (unique_violation) means the database trigger already inserted the profile
        if (insertError && insertError.code !== "23505") {
          // If session is absent, email confirmation is active in Supabase and the client is anon.
          // In this case, the database trigger on_auth_user_created handles the profile,
          // and resolveSupabaseUser self-heals upon first login.
          if (data.session) {
            return NextResponse.json(
              { error: "Account created, but the profile couldn't be saved — contact the Mandram admin." },
              { status: 409 },
            );
          }
        }
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
      const user = actorToDemoUser(actor);
      const res = NextResponse.json({ user: toSessionUser(user) });
      res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
      return res;
    }

    const user = await registerUser({ name, phone, email, password });
    const res = NextResponse.json({ user: toSessionUser(user) });
    res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}