import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { setSettings } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ settings: (await loadDB()).settings });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireUser(["admin"]);
    const body = (await req.json().catch(() => ({}))) as { publicView?: boolean };
    if (typeof body.publicView !== "boolean") {
      return NextResponse.json({ error: "publicView must be a boolean" }, { status: 400 });
    }
    const settings = await setSettings(actor, { publicView: body.publicView });
    return NextResponse.json({ settings });
  } catch (e) {
    return handleApiError(e);
  }
}
