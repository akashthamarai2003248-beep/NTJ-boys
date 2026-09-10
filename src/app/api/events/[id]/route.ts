import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { getEventStats, updateEvent, deleteEvent } from "@/lib/data/repository";
import { resolveEventStatus } from "@/lib/utils/date";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { EventInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const db = await loadDB();
    const rawEvent = db.events.find((e) => e.id === id);
    if (!rawEvent) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    const event = {
      ...rawEvent,
      status: resolveEventStatus(rawEvent.status, rawEvent.startDate, rawEvent.endDate),
    };
    return NextResponse.json({ event, stats: getEventStats(db, id) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as EventInput;
    const event = await updateEvent(actor, id, input);
    return NextResponse.json({ event });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser();
    await deleteEvent(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
