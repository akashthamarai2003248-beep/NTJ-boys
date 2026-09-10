import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionsView } from "@/components/collection/CollectionsView";

export const metadata: Metadata = { title: "Collections · வரவு" };

export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="card-surface h-64 animate-pulse rounded-2xl bg-surface-2" />
      }
    >
      <CollectionsView />
    </Suspense>
  );
}
