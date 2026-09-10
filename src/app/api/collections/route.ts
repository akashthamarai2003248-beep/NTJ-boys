import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { queryCollections, createCollection } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError, intParam } from "@/lib/api-helpers";
import type { CollectionInput, PaymentMethod } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const payment = searchParams.get("payment") as PaymentMethod | null;
    const page = queryCollections(await loadDB(), {
      q: searchParams.get("q") ?? undefined,
      eventId: eventId || undefined,
      payment: payment || null,
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      sort: (searchParams.get("sort") as "newest" | "amount_desc" | "amount_asc" | "name") ?? "newest",
      page: intParam(searchParams.get("page"), 1),
      perPage: Math.min(intParam(searchParams.get("perPage"), 10), 200),
    });
    return NextResponse.json(page);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as CollectionInput;
    const rec = await createCollection(actor, input);
    return NextResponse.json({ collection: rec }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
