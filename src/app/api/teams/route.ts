import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { createTeam } from "@/lib/data/repository";
import type { TeamInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as TeamInput;
    const team = await createTeam(actor, input);
    return NextResponse.json({ team }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
