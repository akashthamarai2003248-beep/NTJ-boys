import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { createEvent, listEvents } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { EventInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ events: listEvents(await loadDB()) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as EventInput;
    const event = await createEvent(actor, input);
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
