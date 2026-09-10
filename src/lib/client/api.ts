"use client";

/* Typed thin client for the route handlers. */

import { clearClientCache } from "./hooks";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }

  // Clear client cache on successful mutations so views reflect new data immediately
  if (init?.method && ["POST", "PATCH", "PUT", "DELETE"].includes(init.method.toUpperCase())) {
    clearClientCache();
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T>(url: string) => request<T>(url);
const post = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const patch = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body) });
const put = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "PUT", body: JSON.stringify(body) });
const del = <T>(url: string) => request<T>(url, { method: "DELETE" });

export const api = { get, post, patch, put, del };

export function qs(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
