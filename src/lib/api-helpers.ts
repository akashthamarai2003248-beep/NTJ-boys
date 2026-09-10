import { NextResponse } from "next/server";
import { HttpError } from "./data/repository";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(data, init);
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Parse a whole-number query param */
export function intParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
