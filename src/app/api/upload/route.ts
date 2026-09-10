import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { getSupabaseServer } from "@/lib/data/supabase";

export const dynamic = "force-dynamic";

/** 400 KB maximum file limit */
export const MAX_IMAGE_BYTES = 400 * 1024; // 409,600 bytes

const ALLOWED_FOLDERS = ["members", "events", "gallery", "expenses", "uploads"] as const;
export type UploadFolder = (typeof ALLOWED_FOLDERS)[number];

export async function POST(req: Request) {
  try {
    await requireUser();

    const formData = await req.formData();
    const file = formData.get("file");
    const rawFolder = ((formData.get("folder") as string) || "uploads").toLowerCase();
    const folder: UploadFolder = ALLOWED_FOLDERS.includes(rawFolder as UploadFolder)
      ? (rawFolder as UploadFolder)
      : "uploads";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG, WEBP) are supported" },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_BYTES + 4096) {
      return NextResponse.json(
        {
          error: `Image exceeds 400 KB limit (${Math.round(file.size / 1024)} KB). Please compress before uploading.`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "image/jpeg";
    const ext = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const filePath = `${folder}/${uniqueId}.${ext}`;

    // Attempt upload to Supabase Storage if credentials are configured
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (sbUrl && sbKey) {
      try {
        const sb = await getSupabaseServer();
        const { data, error } = await sb.storage
          .from("images")
          .upload(filePath, buffer, {
            contentType,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicData } = sb.storage.from("images").getPublicUrl(filePath);
          return NextResponse.json({
            url: publicData.publicUrl,
            size: buffer.length,
            sizeKB: Math.round(buffer.length / 1024),
            path: filePath,
            storage: "supabase",
          });
        }

        if (error) {
          console.warn("[Upload] Supabase Storage upload failed, using compressed fallback:", error.message);
        }
      } catch (storageErr) {
        console.warn("[Upload] Supabase Storage exception:", storageErr);
      }
    }

    // Local / fallback mode: compressed data-URL (strictly <= 400 KB)
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      size: buffer.length,
      sizeKB: Math.round(buffer.length / 1024),
      path: filePath,
      storage: "local",
    });
  } catch (e) {
    return handleApiError(e);
  }
}
