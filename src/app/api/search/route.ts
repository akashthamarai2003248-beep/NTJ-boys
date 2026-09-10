import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { searchAll } from "@/lib/data/repository";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q") ?? "";
    if (q.trim().length === 0) return NextResponse.json({ hits: [] });
    const hits = searchAll(await loadDB(), q.slice(0, 60));
    return NextResponse.json({ hits, query: q });
  } catch (e) {
    return handleApiError(e);
  }
}
