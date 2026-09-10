import { NextResponse } from "next/server";
import { loadDashboardDB } from "@/lib/data/supabase-store";
import { buildSeries, listUpcoming, recentActivity, totals, type Period } from "@/lib/data/repository";
import { handleApiError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["week", "month", "year", "all"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") as Period | null;
    const period: Period = periodParam && PERIODS.includes(periodParam) ? periodParam : "year";

    const db = await loadDashboardDB();
    const t = totals(db);
    const res = NextResponse.json({
      totals: {
        varavu: t.varavu,
        selavu: t.selavu,
        balance: t.balance,
        members: t.members,
        paidMembers: t.paidMembers,
        paidCount: t.paidCount,
        collectionCount: db.collections.length,
        expenseCount: db.expenses.length,
      },
      series: buildSeries(db, period),
      events: listUpcoming(db, 4),
      activity: recentActivity(db, 8),
    });

    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
