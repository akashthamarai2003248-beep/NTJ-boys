import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { createGame, listGames } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { GameInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      games: listGames(await loadDB(true), {
        eventId: searchParams.get("eventId") ?? undefined,
        q: searchParams.get("q") ?? undefined,
        status: searchParams.get("status"),
      }),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as GameInput;
    const game = await createGame(actor, input);
    return NextResponse.json({ game }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
