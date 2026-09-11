"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutGrid } from "lucide-react";
import { BOTTOM_NAV } from "@/lib/nav";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";
import { prefetchRoute, prefetchCoreRoutes } from "@/lib/client/hooks";

export function BottomNav({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t } = useLang();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Sync back to pathname once route transition completes
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Safety fallback: ensure pending state clears even if route transition is aborted
  useEffect(() => {
    if (!pendingHref) return;
    const timer = setTimeout(() => setPendingHref(null), 2500);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  // Preload Next.js route chunks and API data eagerly on mount for instant navigation
  useEffect(() => {
    BOTTOM_NAV.forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch {
        // router.prefetch safe catch
      }
      prefetchRoute(item.href);
    });
    prefetchCoreRoutes();
  }, [router]);

  const currentActive = pendingHref ?? pathname;
  const isActive = (href: string) => (href === "/" ? currentActive === "/" : currentActive.startsWith(href));

  // In English mode bottom tabs show the English name (Home / வரவு…);
  // otherwise the Tamil name — combined mode fits by showing both.
  const label = (item: { en: string; ta: string; id: string }) =>
    lang === "en" ? (item.id === "dashboard" ? "Home" : item.en) : lang === "ta" ? item.ta : `${item.ta} · ${item.en}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label={lang === "en" ? "Primary" : "முதன்மை பட்டை"}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              onClick={() => {
                setPendingHref(item.href);
              }}
              onPointerDown={() => {
                setPendingHref(item.href);
                prefetchRoute(item.href);
              }}
              onTouchStart={() => {
                setPendingHref(item.href);
                prefetchRoute(item.href);
              }}
              onMouseEnter={() => prefetchRoute(item.href)}
              aria-label={item.en}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 transition-transform duration-100 touch-manipulation select-none active:scale-95",
                active ? "text-saffron-600 dark:text-saffron-400" : "text-faint hover:text-muted",
              )}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-saffron-500" />
              )}
              <Icon className="size-[21px]" strokeWidth={active ? 2.3 : 1.9} />
              <span className="max-w-full truncate text-[9.5px] font-bold leading-none tracking-wide">
                {label(item)}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMore}
          onMouseEnter={() => prefetchCoreRoutes()}
          onTouchStart={() => prefetchCoreRoutes()}
          onPointerDown={() => prefetchCoreRoutes()}
          aria-label={t("More", "மேலும்")}
          className={cn(
            "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 transition-transform duration-100 touch-manipulation select-none active:scale-95",
            "text-faint hover:text-muted",
          )}
        >
          <LayoutGrid className="size-[21px]" strokeWidth={1.9} />
          <span className="max-w-full truncate text-[9.5px] font-bold leading-none tracking-wide">
            {label({ en: "More", ta: "மேலும்", id: "more" })}
          </span>
        </button>
      </div>
    </nav>
  );
}
