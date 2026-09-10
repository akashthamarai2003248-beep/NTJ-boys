import { NextResponse } from "next/server";
import { resetDemoData } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Re-seed the local demo database with fresh sample data. */
export async function POST() {
  try {
    await requireUser(["admin"]);
    await resetDemoData();
    return NextResponse.json({ ok: true, message: "Demo data has been reset" });
  } catch (e) {
    return handleApiError(e);
  }
}
