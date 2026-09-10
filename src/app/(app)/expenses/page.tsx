import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpensesView } from "@/components/expense/ExpensesView";

export const metadata: Metadata = { title: "Expenses · செலவு" };

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <div className="card-surface h-64 animate-pulse rounded-2xl bg-surface-2" />
      }
    >
      <ExpensesView />
    </Suspense>
  );
}
