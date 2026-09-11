import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { deleteMatch, updateMatch } from "@/lib/data/repository";
import type { MatchInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const actor = await requireUser(["admin"]);
    const { id } = await ctx.params;
    const input = (await req.json().catch(() => ({}))) as Partial<MatchInput>;
    const match = await updateMatch(actor, id, input);
    return NextResponse.json({ match });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const actor = await requireUser(["admin"]);
    const { id } = await ctx.params;
    await deleteMatch(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
