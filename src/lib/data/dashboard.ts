import { loadDashboardDB } from "@/lib/data/supabase-store";
import { buildSeries, listUpcoming, recentActivity, totals, type Period, type SeriesBucket } from "@/lib/data/repository";
import type { ActivityLog, EventWithStats, MemberPosition } from "@/lib/data/types";

export interface DashboardPayload {
  totals: {
    varavu: number;
    selavu: number;
    balance: number;
    members: number;
    paidMembers?: number;
    paidCount?: number;
    collectionCount?: number;
    expenseCount?: number;
  };
  series: SeriesBucket[];
  allSeries?: Record<Period, SeriesBucket[]>;
  events: (EventWithStats & { role?: MemberPosition })[];
  activity: ActivityLog[];
}

export async function getDashboardPayload(period: Period = "year"): Promise<DashboardPayload> {
  const db = await loadDashboardDB();
  const t = totals(db);
  const allSeries: Record<Period, SeriesBucket[]> = {
    week: buildSeries(db, "week"),
    month: buildSeries(db, "month"),
    year: buildSeries(db, "year"),
    all: buildSeries(db, "all"),
  };
  return {
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
    series: allSeries[period] ?? allSeries.year,
    allSeries,
    events: listUpcoming(db, 4),
    activity: recentActivity(db, 8),
  };
}
