import { NextResponse } from "next/server";
import { getSessionUser, toSessionUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user: user ? toSessionUser(user) : null });
  } catch (e) {
    return handleApiError(e);
  }
}
