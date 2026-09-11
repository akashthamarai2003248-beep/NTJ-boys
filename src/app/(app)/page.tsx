import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getDashboardPayload, type DashboardPayload } from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  let initialData: DashboardPayload | undefined;
  try {
    initialData = await getDashboardPayload("year");
  } catch {
    /* fallback to client fetch if DB unreachable */
  }

  return <DashboardView initialData={initialData} />;
}
