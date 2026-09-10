import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { deleteTeam, updateTeam } from "@/lib/data/repository";
import type { TeamInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    const input = (await req.json().catch(() => ({}))) as Partial<TeamInput>;
    const team = await updateTeam(actor, id, input);
    return NextResponse.json({ team });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const actor = await requireUser();
    const { id } = await ctx.params;
    await deleteTeam(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
