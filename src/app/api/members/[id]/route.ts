import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { getMember, updateMember, deleteMember } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { MemberInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const member = getMember(await loadDB(), id);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    return NextResponse.json({ member });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as MemberInput;
    const member = await updateMember(actor, id, input);
    return NextResponse.json({ member });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser();
    await deleteMember(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
