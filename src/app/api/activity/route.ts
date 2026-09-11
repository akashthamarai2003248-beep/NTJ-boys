import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { recentActivity } from "@/lib/data/repository";
import { handleApiError, intParam } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const db = await loadDB();
    const res = NextResponse.json({ activity: recentActivity(db, intParam(searchParams.get("limit"), 10)) });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
