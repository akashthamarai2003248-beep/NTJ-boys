import { NextResponse } from "next/server";
import { getDB } from "@/lib/data/store";
import { publicOverview } from "@/lib/data/repository";
import { isSupabaseMode, getSupabaseServer } from "@/lib/data/supabase";
import { resolveEventStatus } from "@/lib/utils/date";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** Public transparency — aggregates only, never phone numbers or member names. */
export async function GET() {
  try {
    if (isSupabaseMode()) {
      // public_overview() is a security-definer RPC that only exposes
      // aggregates (and only while the admin left the public view on).
      const sb = await getSupabaseServer();
      const { data, error } = await sb.rpc("public_overview");
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ enabled: false, totals: null, events: [] });
      // PostgREST returns `json` as a string — parse so the client gets an object.
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (payload && Array.isArray(payload.events)) {
        payload.events = payload.events.map((e: any) => ({
          ...e,
          status: resolveEventStatus(e.status, e.startDate, e.endDate),
        }));
      }
      return NextResponse.json(payload);
    }
    return NextResponse.json(publicOverview(getDB()));
  } catch (e) {
    return handleApiError(e);
  }
}
