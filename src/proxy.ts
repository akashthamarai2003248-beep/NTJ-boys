import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Next 16 renamed middleware → proxy. Guards the app shell:
 * signed-out users go to /login; signed-in users skip /login.
 * The /public transparency view stays open (no login).
 *
 * Sessions are either the local demo cookie (nbm_session) or a
 * Supabase Auth cookie (sb-<project>-auth-token) in Phase 3.
 */
export function proxy(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  const cookies = req.cookies;
  const hasSession =
    Boolean(cookies.get(SESSION_COOKIE)?.value) ||
    cookies.getAll().some((c) => c.name.startsWith("sb-") && Boolean(c.value) && c.value !== '""' && c.value !== "[]");

  const isLogin = pathname === "/login";
  const isPublicView = pathname === "/public" || pathname.startsWith("/public");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/public");


  if (!hasSession && !isLogin && !isPublicView && !isAuthApi && !isPublicApi) {
    const url = new URL("/login", origin);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|nbm-mark.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
