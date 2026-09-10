"use client";

import {
  compressImage,
  MAX_IMAGE_SIZE_BYTES,
  type CompressionOptions,
} from "@/lib/utils/image-compression";

export interface UploadResult {
  url: string;
  sizeKB: number;
  formattedSize: string;
  storage: "supabase" | "local";
  path?: string;
}

export type UploadFolder = "members" | "events" | "gallery" | "expenses" | "uploads";

/**
 * Compresses an image to <= 400 KB and uploads it to Supabase Storage.
 *
 * Flow:
 * 1. Client-side canvas compression reduces any photo to <= 400 KB.
 * 2. Uploads the compressed blob to /api/upload -> Supabase Storage bucket 'images'.
 * 3. Returns the public CDN URL (or high-efficiency compressed data URL fallback).
 */
export async function uploadImage(
  file: File | Blob,
  folder: UploadFolder = "uploads",
  compressionOptions?: CompressionOptions,
): Promise<UploadResult> {
  if (!file) {
    throw new Error("No image file provided");
  }

  // 1. Compress image to strictly <= 400 KB in the browser
  const compressed = await compressImage(file, {
    maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
    maxWidth: folder === "members" ? 800 : 1920,
    maxHeight: folder === "members" ? 800 : 1920,
    ...compressionOptions,
  });

  // 2. Upload the compressed blob to server API
  try {
    const body = new FormData();
    body.append("file", compressed.file);
    body.append("folder", folder);

    const res = await fetch("/api/upload", {
      method: "POST",
      body,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        url: data.url,
        sizeKB: data.sizeKB || compressed.sizeKB,
        formattedSize: compressed.formattedSize,
        storage: data.storage || "supabase",
        path: data.path,
      };
    }

    const errJson = await res.json().catch(() => null);
    const message = errJson?.error || "Upload server error";
    console.warn("[Upload] Server returned error, using compressed preview fallback:", message);

    // Fallback to client-compressed data-URL (under 400KB)
    return {
      url: compressed.dataUrl,
      sizeKB: compressed.sizeKB,
      formattedSize: compressed.formattedSize,
      storage: "local",
    };
  } catch (err) {
    console.warn("[Upload] Network error uploading to storage, using compressed fallback:", err);
    return {
      url: compressed.dataUrl,
      sizeKB: compressed.sizeKB,
      formattedSize: compressed.formattedSize,
      storage: "local",
    };
  }
}
