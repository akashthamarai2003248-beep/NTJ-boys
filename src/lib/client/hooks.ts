"use client";

/* react-hooks/set-state-in-effect: this hook intentionally manages an
   async fetch lifecycle (loading → data/error) driven by effect deps. */
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export const useIsMobile = () => useMediaQuery("(max-width: 639px)");

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

export function useClickOutside(onOutside: () => void, active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOutside();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [active, onOutside]);
  return ref;
}

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const clientCache = new Map<string, { data: unknown; timestamp: number }>();
const CLIENT_CACHE_TTL = 30_000; // 30 seconds
const PERSIST_PREFIX = "nbm_cache_";
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max persistent stale cache

function readPersistentCache<T>(url: string): { data: T; timestamp: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + url);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.timestamp === "number" && Date.now() - parsed.timestamp < PERSIST_MAX_AGE_MS) {
      return parsed as { data: T; timestamp: number };
    }
  } catch {
    /* ignore storage read error */
  }
  return null;
}

function writePersistentCache(url: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSIST_PREFIX + url, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    /* ignore storage quota error */
  }
}

function removePersistentCache(prefix?: string) {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PERSIST_PREFIX)) {
        if (!prefix || key.startsWith(PERSIST_PREFIX + prefix)) {
          keysToRemove.push(key);
        }
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/** Clear client cache, optionally matching a URL prefix (or all if omitted). */
export function clearClientCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    removePersistentCache();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) clientCache.delete(key);
  }
  removePersistentCache(prefix);
}

const inFlightPrefetches = new Map<string, Promise<unknown>>();

/**
 * Preload an API endpoint into clientCache and localStorage ahead of time.
 * When the target view mounts, useFetch serves this data in 0ms without showing loading skeletons.
 */
export function prefetchData(url: string): Promise<unknown> {
  if (typeof window === "undefined" || !url) return Promise.resolve(null);

  const mem = clientCache.get(url);
  if (mem && Date.now() - mem.timestamp < 3_000) {
    return Promise.resolve(mem.data);
  }

  const existing = inFlightPrefetches.get(url);
  if (existing) return existing;

  const promise = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data) {
        clientCache.set(url, { data, timestamp: Date.now() });
        writePersistentCache(url, data);
      }
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inFlightPrefetches.delete(url);
    });

  inFlightPrefetches.set(url, promise);
  return promise;
}

/** Prefetch data for a specific navigation route on hover / touch / intent */
export function prefetchRoute(route: string) {
  if (typeof window === "undefined" || !route) return;
  if (route === "/collections" || route.startsWith("/collections")) {
    void prefetchData("/api/collections?page=1&perPage=10");
    void prefetchData("/api/events");
  } else if (route === "/expenses" || route.startsWith("/expenses")) {
    void prefetchData("/api/expenses?page=1&perPage=10");
    void prefetchData("/api/events");
  } else if (route === "/events" || route.startsWith("/events")) {
    void prefetchData("/api/events");
  } else if (route === "/") {
    void prefetchData("/api/dashboard");
  } else if (route === "/members") {
    void prefetchData("/api/members?page=1&perPage=15");
  } else if (route === "/reports") {
    void prefetchData("/api/reports?year=all");
  }
}

/** Preload the core navigation endpoints in the background for zero-latency page transitions */
export function prefetchCoreRoutes() {
  if (typeof window === "undefined") return;
  void prefetchData("/api/collections?page=1&perPage=10");
  void prefetchData("/api/expenses?page=1&perPage=10");
  void prefetchData("/api/events");
  void prefetchData("/api/dashboard");
}

/**
 * Fetch a JSON endpoint on mount / whenever `url` changes.
 * Uses persistent Stale-While-Revalidate (SWR) so the Home page and previously
 * visited pages render instantly (0ms) from local cache with zero flicker or blank
 * loading screens, while keeping data fresh via background revalidation.
 */
export function useFetch<T>(
  url: string | null,
  deps: unknown[] = [],
  initialData?: T,
): AsyncState<T> & { reload: () => void } {
  const getCachedEntry = useCallback((): { data: T; timestamp: number } | null => {
    if (!url) return null;
    const mem = clientCache.get(url);
    if (mem) return mem as { data: T; timestamp: number };
    const pers = readPersistentCache<T>(url);
    if (pers) {
      clientCache.set(url, pers);
      return pers;
    }
    return null;
  }, [url]);

  const [state, setState] = useState<AsyncState<T>>(() => {
    if (initialData) {
      if (url) {
        clientCache.set(url, { data: initialData, timestamp: Date.now() });
        writePersistentCache(url, initialData);
      }
      return { data: initialData, error: null, loading: false };
    }
    if (!url) return { data: null, error: null, loading: false };
    const cached = getCachedEntry();
    return {
      data: cached ? cached.data : null,
      error: null,
      loading: !cached,
    };
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    const currentCached = getCachedEntry();

    // If cached data is present, immediately serve it without blocking render
    if (currentCached) {
      setState((s) => ({ ...s, data: currentCached.data, error: null, loading: false }));
      // Throttle very rapid back-to-back revalidations within 1.5s
      if (tick === 0 && Date.now() - currentCached.timestamp < 1500) {
        return;
      }
    } else {
      setState((s) => ({ ...s, loading: true, error: null }));
    }

    const ctrl = new AbortController();
    let active = true;

    fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body as { error?: string }).error ?? "Failed to load");
        if (active) {
          const entry = { data: body, timestamp: Date.now() };
          clientCache.set(url, entry);
          writePersistentCache(url, body);
          setState({ data: body as T, error: null, loading: false });
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Keep previously displayed cached data instead of blanking out the view
        setState((s) => ({
          data: s.data,
          error: (err as Error).message,
          loading: false,
        }));
      });

    // Auto-revalidate when tab gains focus or device is unlocked
    const onVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        setTick((t) => t + 1);
      }
    };
    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      active = false;
      ctrl.abort();
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, getCachedEntry, ...deps]);

  const reload = useCallback(() => {
    if (url) {
      clientCache.delete(url);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(PERSIST_PREFIX + url);
        } catch {
          /* ignore */
        }
      }
    }
    setTick((t) => t + 1);
  }, [url]);

  return { ...state, reload };
}
