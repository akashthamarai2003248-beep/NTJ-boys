import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery/GalleryView";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  return <GalleryView eventId={eventId} />;
}
