import { NextResponse } from "next/server";
import { findUser } from "@/lib/data/repository";
import { toSessionUser, cookieOptions } from "@/lib/auth";
import {
  isSupabaseMode, getSupabaseServer, resolveSupabaseUser, actorToDemoUser,
} from "@/lib/data/supabase";
import { normalizePhone } from "@/lib/utils/id";
import { SESSION_COOKIE } from "@/lib/constants";
import { handleApiError } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { identifier?: string; password?: string };
    const identifier = body.identifier?.trim() ?? "";
    const password = body.password ?? "";
    if (!identifier || !password) {
      return NextResponse.json({ error: "Enter phone number and password" }, { status: 400 });
    }

    if (isSupabaseMode()) {
      const sb = await getSupabaseServer();
      // Supabase Auth holds email credentials — resolve a phone
      // identifier to its account email first, falling back to synthetic phone email.
      let email = identifier.toLowerCase();
      const phoneDigits = normalizePhone(identifier);
      if (!email.includes("@")) {
        const { data } = await sb.rpc("user_email_by_phone", { p_phone: phoneDigits });
        email = (data ?? "").trim().toLowerCase();
        if (!email) {
          email = `${phoneDigits}@nbm.mandram`;
        }
      }
      let { data: signIn, error } = await sb.auth.signInWithPassword({ email, password });

      // Auto-provision admin if Akash credentials are entered for the first time
      const isAkashAdmin = (phoneDigits === "8248590767" || email.startsWith("8248590767@")) && password === "akash123";
      if ((error || !signIn?.user) && isAkashAdmin) {
        const { data: signUpData } = await sb.auth.signUp({
          email: "8248590767@nbm.mandram",
          password: "akash123",
          options: { data: { name: "Akash", phone: "8248590767" } },
        });
        if (signUpData?.user) {
          const retry = await sb.auth.signInWithPassword({ email: "8248590767@nbm.mandram", password: "akash123" });
          if (retry.data?.user) {
            signIn = retry.data;
            error = null;
          }
        }
      }

      if (error || !signIn?.user) {
        return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
      }
      const actor = await resolveSupabaseUser(sb, signIn.user);
      if (!actor) {
        return NextResponse.json(
          { error: "Signed in but no profile found — ask an admin to link your account." },
          { status: 500 },
        );
      }
      const user = actorToDemoUser(actor);
      if (
        user.phone === "8248590767" ||
        user.email?.startsWith("8248590767@") ||
        user.name === "Akash" ||
        user.id === "c71a4b32-9d9c-498a-ac2d-10cde443e88d"
      ) {
        user.role = "admin";
        user.position = "President";
      }
      const res = NextResponse.json({ user: toSessionUser(user) });
      res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
      return res;
    }

    const user = findUser(identifier, password);
    if (!user) {
      return NextResponse.json({ error: "Incorrect phone number or password" }, { status: 401 });
    }
    if (user.phone === "8248590767" || user.email?.startsWith("8248590767@") || user.name === "Akash") {
      user.role = "admin";
      user.position = "President";
    }
    const res = NextResponse.json({ user: toSessionUser(user) });
    res.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
