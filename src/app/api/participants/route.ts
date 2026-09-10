import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { createParticipant } from "@/lib/data/repository";
import type { ParticipantInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as ParticipantInput;
    const participant = await createParticipant(actor, input);
    return NextResponse.json({ participant }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
