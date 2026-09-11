import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { buildReports } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const data = buildReports(await loadDB(), year && /^\d{4}$/.test(year) ? year : "all");
    const res = NextResponse.json(data);
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
