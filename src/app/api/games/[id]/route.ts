import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { deleteGame, getGameDetail, updateGame } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { GameInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const detail = getGameDetail(await loadDB(), id);
    if (!detail) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    return NextResponse.json({ game: detail });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const input = (await req.json().catch(() => ({}))) as Partial<GameInput>;
    const game = await updateGame(actor, id, input);
    return NextResponse.json({ game });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    await deleteGame(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
