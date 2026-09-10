"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { BOTTOM_NAV } from "@/lib/nav";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

export function BottomNav({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = usePathname();
  const { lang, t } = useLang();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
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
