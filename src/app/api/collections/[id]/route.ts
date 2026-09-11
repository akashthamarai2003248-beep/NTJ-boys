import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { updateCollection, deleteCollection } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { CollectionInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const rec = (await loadDB()).collections.find((c) => c.id === id);
    if (!rec) return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    return NextResponse.json({ collection: rec });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser(["admin", "treasurer"]);
    const input = (await req.json().catch(() => ({}))) as CollectionInput;
    const rec = await updateCollection(actor, id, input);
    return NextResponse.json({ collection: rec });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser(["admin", "treasurer"]);
    await deleteCollection(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
