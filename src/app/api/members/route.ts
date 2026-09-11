import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { createMember, queryMembers } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { MemberInput, MemberPosition } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const area = searchParams.get("area");
    const role = searchParams.get("role") as MemberPosition | null;
    const members = queryMembers(await loadDB(), {
      q: searchParams.get("q") ?? undefined,
      area: area || undefined,
      role: role || null,
    });
    const res = NextResponse.json({ members, total: members.length });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser(["admin"]);
    const input = (await req.json().catch(() => ({}))) as MemberInput;
    const member = await createMember(actor, input);
    return NextResponse.json({ member }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
