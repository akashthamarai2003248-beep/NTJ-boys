import { NextResponse } from "next/server";
import { loadDB } from "@/lib/data/supabase-store";
import { createGalleryItem, listGallery } from "@/lib/data/repository";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { GalleryInput } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") ?? undefined;
    return NextResponse.json({ photos: listGallery(await loadDB(true), { eventId }) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser(["admin"]);
    const input = (await req.json().catch(() => ({}))) as GalleryInput;
    const photo = await createGalleryItem(actor, input);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
