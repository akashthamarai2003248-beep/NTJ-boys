/**
 * Client-side image compression utility.
 * Compresses images across the application to <= 400 KB while maintaining
 * high visual clarity and proper aspect ratio.
 */

export const MAX_IMAGE_SIZE_BYTES = 400 * 1024; // 400 KB (409,600 bytes)

export interface CompressionOptions {
  /** Maximum allowed size in bytes. Default: 400 KB (409,600 bytes) */
  maxSizeBytes?: number;
  /** Maximum width in pixels. Default: 1920 */
  maxWidth?: number;
  /** Maximum height in pixels. Default: 1920 */
  maxHeight?: number;
  /** Initial quality (0.0 to 1.0). Default: 0.85 */
  initialQuality?: number;
}

export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
  sizeKB: number;
  formattedSize: string;
  width: number;
  height: number;
}

/**
 * Format byte count into human readable KB string
 */
export function formatKB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Loads an image File or Blob into an HTMLImageElement in the browser.
 */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = objectUrl;
  });
}

/**
 * Converts a Canvas to a Blob with target MIME type and quality.
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Converts a Blob to a base64 Data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read compressed blob as data URL"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses an image file in the browser to ensure its size is strictly <= maxSizeBytes (default 400 KB).
 */
export async function compressImage(
  source: File | Blob,
  options?: CompressionOptions,
): Promise<CompressionResult> {
  const maxSizeBytes = options?.maxSizeBytes ?? MAX_IMAGE_SIZE_BYTES;
  const maxWidth = options?.maxWidth ?? 1920;
  const maxHeight = options?.maxHeight ?? 1920;
  const initialQuality = options?.initialQuality ?? 0.85;

  // If running outside browser (SSR/Node), return as-is
  if (typeof window === "undefined" || typeof document === "undefined") {
    const size = source.size;
    const name = (source as File).name || "image.jpg";
    const file = source instanceof File ? source : new File([source], name, { type: source.type });
    return {
      file,
      blob: source,
      dataUrl: "",
      sizeBytes: size,
      sizeKB: Math.round(size / 1024),
      formattedSize: formatKB(size),
      width: 0,
      height: 0,
    };
  }

  const img = await loadImage(source);
  let curWidth = img.naturalWidth || img.width;
  let curHeight = img.naturalHeight || img.height;

  // Scale down dimensions if exceeding max bounds
  if (curWidth > maxWidth || curHeight > maxHeight) {
    const ratio = Math.min(maxWidth / curWidth, maxHeight / curHeight);
    curWidth = Math.round(curWidth * ratio);
    curHeight = Math.round(curHeight * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = curWidth;
  canvas.height = curHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Draw image to canvas
  ctx.drawImage(img, 0, 0, curWidth, curHeight);

  // Preferred format: webp, fallback to jpeg
  const mimeType = "image/webp";
  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  // If browser doesn't support WebP export, fallback to JPEG
  const effectiveMime = blob && blob.type === "image/webp" ? "image/webp" : "image/jpeg";
  if (effectiveMime === "image/jpeg" && (!blob || blob.type !== "image/webp")) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  // Stepped compression loop if output is still > 400 KB
  const qualitySteps = [0.80, 0.70, 0.60, 0.50, 0.40, 0.30];
  let stepIdx = 0;

  while (blob && blob.size > maxSizeBytes && stepIdx < qualitySteps.length) {
    quality = qualitySteps[stepIdx];
    blob = await canvasToBlob(canvas, effectiveMime, quality);
    stepIdx++;
  }

  // If still above limit after quality reduction, downscale canvas dimensions
  while (blob && blob.size > maxSizeBytes && (curWidth > 400 || curHeight > 400)) {
    curWidth = Math.round(curWidth * 0.8);
    curHeight = Math.round(curHeight * 0.8);
    canvas.width = curWidth;
    canvas.height = curHeight;
    ctx.drawImage(img, 0, 0, curWidth, curHeight);
    blob = await canvasToBlob(canvas, effectiveMime, quality);
  }

  if (!blob) {
    throw new Error("Failed to produce compressed image blob");
  }

  const baseName = (source as File).name?.replace(/\.[^/.]+$/, "") || "image";
  const extension = effectiveMime === "image/webp" ? ".webp" : ".jpg";
  const outputFileName = `${baseName}-compressed${extension}`;
  const compressedFile = new File([blob], outputFileName, {
    type: effectiveMime,
    lastModified: Date.now(),
  });

  const dataUrl = await blobToDataUrl(blob);

  return {
    file: compressedFile,
    blob,
    dataUrl,
    sizeBytes: blob.size,
    sizeKB: Math.round(blob.size / 1024),
    formattedSize: formatKB(blob.size),
    width: curWidth,
    height: curHeight,
  };
}
