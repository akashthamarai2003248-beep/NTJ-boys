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
  const { pathname, origin, searchParams } = req.nextUrl;
  const cookies = req.cookies;
  const isLogin = pathname === "/login";
  const isLogout = searchParams.has("logout");

  // If user is explicitly logging out, wipe session cookies and let them view /login immediately
  if (isLogin && isLogout) {
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    for (const c of cookies.getAll()) {
      if (c.name.startsWith("sb-") || c.name.startsWith("nbm")) {
        res.cookies.set(c.name, "", { path: "/", maxAge: 0 });
      }
    }
    return res;
  }

  const sessionCookie = cookies.get(SESSION_COOKIE)?.value;
  const hasSession =
    Boolean(sessionCookie && sessionCookie !== '""' && sessionCookie !== "deleted") ||
    cookies.getAll().some((c) => c.name.startsWith("sb-") && Boolean(c.value) && c.value !== '""' && c.value !== "[]" && c.value !== "deleted");

  const isPublicView = pathname === "/public" || pathname.startsWith("/public");
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublicApi = pathname.startsWith("/api/public");

  // Signed-in users skip /login only if explicit next destination is set; default routing is handled by zero-flash client guard
  if (hasSession && isLogin && searchParams.has("next") && !isLogout) {
    const next = searchParams.get("next");
    const destination = next && next.startsWith("/") ? next : "/";
    return NextResponse.redirect(new URL(destination, origin));
  }

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
