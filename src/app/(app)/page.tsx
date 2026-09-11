import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-5 sm:space-y-6">
          <div className="h-44 animate-pulse rounded-2xl bg-surface-2" />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card-surface h-28 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
