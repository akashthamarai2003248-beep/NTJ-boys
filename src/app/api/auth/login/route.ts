import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
      const rawKey = identifier.trim().toLowerCase();
      const phoneDigits = normalizePhone(identifier);
      const isNtjAdmin = rawKey === "ntjboys" || rawKey === "admin";
      const isAkashAdmin = phoneDigits === "8248590767";

      let email = rawKey;
      if (isNtjAdmin) {
        email = "ntjboys@nbm.mandram";
      } else if (isAkashAdmin) {
        email = "8248590767@nbm.mandram";
      } else if (!email.includes("@")) {
        const { data } = await sb.rpc("user_email_by_phone", { p_phone: phoneDigits });
        email = (data ?? "").trim().toLowerCase();
        if (!email) {
          email = `${phoneDigits}@nbm.mandram`;
        }
      }

      let { data: signIn, error } = await sb.auth.signInWithPassword({ email, password });

      // Auto-provision if admin credentials are used for the first time
      if ((error || !signIn?.user) && (isNtjAdmin || isAkashAdmin)) {
        const adminEmail = isNtjAdmin ? "ntjboys@nbm.mandram" : "8248590767@nbm.mandram";
        const adminPw = isNtjAdmin ? (password || "ntj2010") : (password || "akash123");
        const { data: signUpData } = await sb.auth.signUp({
          email: adminEmail,
          password: adminPw,
          options: { data: { name: "Admin", phone: "ntjboys" } },
        });
        if (signUpData?.user) {
          const retry = await sb.auth.signInWithPassword({ email: adminEmail, password: adminPw });
          if (retry.data?.user) {
            signIn = retry.data;
            error = null;
          }
        }
      }

      if (error || !signIn?.user) {
        return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
      }
      const actor = await resolveSupabaseUser(sb, signIn.user);
      if (!actor) {
        return NextResponse.json(
          { error: "Signed in but no profile found — ask an admin to link your account." },
          { status: 500 },
        );
      }
      const user = actorToDemoUser(actor);
      const isPrivilegedAdmin =
        isNtjAdmin ||
        isAkashAdmin ||
        user.email === "ntjboys@nbm.mandram" ||
        user.phone === "8248590767" ||
        user.phone === "ntjboys" ||
        user.id === "d532ba34-ff29-4fcc-98c6-1b9ed6878e99" ||
        user.id === "c71a4b32-9d9c-498a-ac2d-10cde443e88d";

      if (isPrivilegedAdmin) {
        user.role = "admin";
        user.position = "President";
      }
      const res = NextResponse.json({ user: toSessionUser(user) });
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

    const key = identifier.trim().toLowerCase();
    const user = findUser(identifier, password);
    if (!user) {
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }
    if (key === "ntjboys" || key === "admin" || user.phone === "8248590767" || user.role === "admin") {
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
