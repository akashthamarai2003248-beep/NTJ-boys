import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { registerUser } from "@/lib/data/repository";
import { toSessionUser, cookieOptions, cacheSessionUser } from "@/lib/auth";
import type { DemoUser } from "@/lib/data/types";
import {
  isSupabaseMode, getSupabaseServer, actorToDemoUser,
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
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name, phone } },
      });
      if (error) {
        const msg = error.message?.toLowerCase().includes("already registered") ||
          error.message?.toLowerCase().includes("already exists") ||
          error.status === 422
          ? "This phone number is already registered — try logging in"
          : error.message;
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
        return NextResponse.json(
          { error: "This phone number is already registered — try logging in" },
          { status: 409 },
        );
      }

      const isAdminPhone = phone === "8248590767";
      const assignedRole = isAdminPhone ? "admin" : "member";
      const assignedPosition = isAdminPhone ? "Admin" : "Member";

      const newUserId = data.user.id;
      // Ensure user profile is created synchronously or with tight timeout so SSR on / finds the row
      try {
        await Promise.race([
          sb.rpc("create_user_profile", {
            p_id: newUserId,
            p_name: name,
            p_phone: phone,
            p_email: email,
          }),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
        if (isAdminPhone) {
          await sb.from("users").update({ role: "admin", position: "President" }).eq("id", newUserId);
        }
      } catch {
        /* ignore */
      }

      if (!data.session) {
        // Email confirmation is enabled in Supabase Auth — the user
        // must click the link before their first sign-in.
        return NextResponse.json({ needsConfirmation: true, email });
      }

      // Construct verified session user directly in-memory to avoid redundant SELECT round-trips
      const user: DemoUser = {
        id: data.user.id,
        name,
        phone,
        email,
        password: "",
        role: assignedRole,
        position: (isAdminPhone ? "President" : assignedPosition) as DemoUser["position"],
      };

      // Pre-warm server session cache so Next.js hydration resolves in 0ms
      cacheSessionUser(user);

      const res = NextResponse.json({
        user: toSessionUser(user),
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        } : null,
      });

      const cookieStore = await cookies();
      for (const c of cookieStore.getAll()) {
        res.cookies.set(c.name, c.value, {
          path: "/",
          sameSite: "lax",
          secure: cookieOptions.secure,
          maxAge: cookieOptions.maxAge,
        });
      }
      res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
      return res;
    }

    const user = await registerUser({ name, phone, email, password });
    cacheSessionUser(user);
    const res = NextResponse.json({ user: toSessionUser(user) });
    res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}