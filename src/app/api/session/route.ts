import { NextResponse } from "next/server";
import { getSessionUser, toSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    const res = NextResponse.json({ user: user ? toSessionUser(user) : null });
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
