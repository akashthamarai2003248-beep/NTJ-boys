import { NextResponse } from "next/server";
import { getDashboardPayload } from "@/lib/data/dashboard";
import { handleApiError } from "@/lib/api-helpers";
import type { Period } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["week", "month", "year", "all"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") as Period | null;
    const period: Period = periodParam && PERIODS.includes(periodParam) ? periodParam : "year";

    const payload = await getDashboardPayload(period);
    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
