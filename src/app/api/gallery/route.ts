import { NextResponse } from "next/server";
import { createGalleryItem, getGalleryPhotos } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { GalleryInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") ?? undefined;
    const photos = await getGalleryPhotos({ eventId });
    const res = NextResponse.json({ photos });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const input = (await req.json().catch(() => ({}))) as GalleryInput;
    const photo = await createGalleryItem(actor, input);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
