import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { updateExpense, deleteExpense } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { ExpenseInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const rec = (await loadDB()).expenses.find((e) => e.id === id);
    if (!rec) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json({ expense: rec });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as ExpenseInput;
    const rec = await updateExpense(actor, id, input);
    return NextResponse.json({ expense: rec });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const actor = await requireUser();
    await deleteExpense(actor, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
