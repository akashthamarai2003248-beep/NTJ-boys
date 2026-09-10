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

/** Clear client cache, optionally matching a URL prefix (or all if omitted). */
export function clearClientCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.startsWith(prefix)) clientCache.delete(key);
  }
}

/**
 * Fetch a JSON endpoint on mount / whenever `url` changes.
 * Uses in-memory SWR (Stale-While-Revalidate) so navigating back to previously
 * visited pages renders instantly (0ms) with zero flicker or blank loading screens.
 */
export function useFetch<T>(url: string | null, deps: unknown[] = []): AsyncState<T> & { reload: () => void } {
  const cached = url ? clientCache.get(url) : null;
  const hasFreshCache = Boolean(cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL);

  const [state, setState] = useState<AsyncState<T>>(() => ({
    data: (cached?.data as T) ?? null,
    error: null,
    loading: !!url && !hasFreshCache,
  }));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    const currentCached = clientCache.get(url);

    // If cached data is present, immediately serve it
    if (currentCached) {
      setState((s) => ({ ...s, data: currentCached.data as T, error: null, loading: false }));
      // If the cache was fetched very recently (< 5s) and not an explicit reload, avoid redundant re-fetch
      if (tick === 0 && Date.now() - currentCached.timestamp < 5_000) {
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
          clientCache.set(url, { data: body, timestamp: Date.now() });
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

    return () => {
      active = false;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...deps]);

  const reload = useCallback(() => {
    if (url) clientCache.delete(url);
    setTick((t) => t + 1);
  }, [url]);

  return { ...state, reload };
}
