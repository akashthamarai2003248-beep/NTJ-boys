import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_SIZE_BYTES,
  formatKB,
  compressImage,
} from "../utils/image-compression";
import { MAX_IMAGE_BYTES } from "@/app/api/upload/route";

describe("image compression & storage rules", () => {
  it("enforces exact 400 KB limit (409,600 bytes)", () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(400 * 1024);
    expect(MAX_IMAGE_SIZE_BYTES).toBe(409600);
    expect(MAX_IMAGE_BYTES).toBe(400 * 1024);
  });

  it("formats byte counts into KB correctly", () => {
    expect(formatKB(409600)).toBe("400 KB");
    expect(formatKB(204800)).toBe("200 KB");
    expect(formatKB(1024)).toBe("1 KB");
    expect(formatKB(0)).toBe("0 KB");
  });

  it("handles non-browser node environment safely without throwing", async () => {
    // Create a mock blob of 100 KB
    const buffer = new Uint8Array(100 * 1024);
    const blob = new Blob([buffer], { type: "image/jpeg" });

    const result = await compressImage(blob);
    expect(result.sizeBytes).toBe(100 * 1024);
    expect(result.sizeKB).toBe(100);
    expect(result.formattedSize).toBe("100 KB");
  });
});
