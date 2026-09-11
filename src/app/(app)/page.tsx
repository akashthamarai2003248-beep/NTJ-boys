import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { getDashboardPayload, type DashboardPayload } from "@/lib/data/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  let initialData: DashboardPayload | undefined = undefined;
  try {
    initialData = await getDashboardPayload("year");
  } catch {
    /* fallback to client fetch if any error */
  }
  return <DashboardView initialData={initialData} />;
}
