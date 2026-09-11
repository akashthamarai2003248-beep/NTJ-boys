import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { queryExpenses, createExpense } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError, intParam } from "@/lib/api-helpers";
import type { ExpenseCategory, ExpenseInput, PaymentMethod } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const category = searchParams.get("category") as ExpenseCategory | null;
    const payment = searchParams.get("payment") as PaymentMethod | null;
    const yearParam = searchParams.get("year");
    const year = yearParam && /^\d{4}$/.test(yearParam) ? yearParam : undefined;
    const page = queryExpenses(await loadDB(), {
      q: searchParams.get("q") ?? undefined,
      eventId: eventId || undefined,
      category: category || null,
      payment: payment || null,
      from: year ? `${year}-01-01` : searchParams.get("from"),
      to: year ? `${year}-12-31` : searchParams.get("to"),
      sort: (searchParams.get("sort") as "newest" | "amount_desc" | "amount_asc" | "title") ?? "newest",
      page: intParam(searchParams.get("page"), 1),
      perPage: Math.min(intParam(searchParams.get("perPage"), 10), 200),
    });
    const res = NextResponse.json(page);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser(["admin", "treasurer"]);
    const input = (await req.json().catch(() => ({}))) as ExpenseInput;
    const rec = await createExpense(actor, input);
    return NextResponse.json({ expense: rec }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
