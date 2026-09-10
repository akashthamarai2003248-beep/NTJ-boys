import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { clearGameResults, setGameResults } from "@/lib/data/repository";
import type { GameResultInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Replace the podium (positions 1–3) for a game. */
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const rows = ((await req.json().catch(() => ({}))) as { results?: GameResultInput[] }).results ?? [];
    const results = await setGameResults(actor, id, rows);
    return NextResponse.json({ results }, { status: 200 });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Clear the podium and reopen the game. */
export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    await clearGameResults(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
