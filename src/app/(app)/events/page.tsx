import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsView } from "@/components/event/EventsView";

export const metadata: Metadata = { title: "Events · நிகழ்வுகள்" };

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="card-surface h-64 animate-pulse rounded-2xl bg-surface-2" />
      }
    >
      <EventsView />
    </Suspense>
  );
}
