import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { createMatch } from "@/lib/data/repository";
import type { MatchInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as MatchInput;
    const match = await createMatch(actor, input);
    return NextResponse.json({ match }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
