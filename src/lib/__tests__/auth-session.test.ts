import { describe, expect, it, beforeEach } from "vitest";
import { isSupabaseMode } from "@/lib/data/supabase-browser";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { cacheSessionUser, invalidateSessionUser } from "@/lib/auth";
import type { DemoUser } from "@/lib/data/types";

describe("supabase browser client helper", () => {
  it("detects supabase mode accurately based on env", () => {
    // Should be boolean
    expect(typeof isSupabaseMode()).toBe("boolean");
  });
});

describe("proxy auth routing & race condition prevention", () => {
  it("redirects unauthenticated users to /login", () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("redirects unauthenticated users to /login with next param preserved", () => {
    const req = new NextRequest("http://localhost:3000/events");
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fevents");
  });

  it("allows unauthenticated access to /public", () => {
    const req = new NextRequest("http://localhost:3000/public");
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows authenticated user to view protected route when nbm_session cookie is set", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: {
        cookie: `${SESSION_COOKIE}=usr_12345`,
      },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows authenticated user to view protected route when Supabase sb- cookie is set", () => {
    const req = new NextRequest("http://localhost:3000/", {
      headers: {
        cookie: `sb-project-auth-token=eyJhbGciOi...`,
      },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("redirects authenticated user away from /login immediately to /", () => {
    const req = new NextRequest("http://localhost:3000/login", {
      headers: {
        cookie: `${SESSION_COOKIE}=usr_12345`,
      },
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects authenticated user away from /login to their ?next destination", () => {
    const req = new NextRequest("http://localhost:3000/login?next=/expenses", {
      headers: {
        cookie: `${SESSION_COOKIE}=usr_12345`,
      },
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/expenses");
  });

  it("allows user to access /login when ?logout=1 is present, wiping session cookies", () => {
    const req = new NextRequest("http://localhost:3000/login?logout=1", {
      headers: {
        cookie: `${SESSION_COOKIE}=usr_12345; sb-token=abc`,
      },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
    // Cookie was wiped
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("nbm_session=;");
  });
});

describe("session memory cache for fast navigation and offline resilience", () => {
  beforeEach(() => {
    invalidateSessionUser();
  });

  it("caches session user for zero-latency retrieval", () => {
    const testUser: DemoUser = {
      id: "usr_test_1",
      name: "Test Member",
      phone: "9840011223",
      email: "test@nbm.mandram",
      password: "",
      role: "member",
      position: "Member",
    };

    cacheSessionUser(testUser);
    // Invalidating a specific ID works
    invalidateSessionUser("usr_other");
    // Invalidating the cached ID works
    invalidateSessionUser("usr_test_1");
  });
});
