import type { Metadata } from "next";
import { EventDetailView } from "@/components/event/EventDetailView";

export const metadata: Metadata = { title: "Event" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventDetailView id={id} />;
}
