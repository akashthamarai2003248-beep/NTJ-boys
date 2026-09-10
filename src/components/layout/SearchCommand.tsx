"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays, HandCoins, Search, SearchX, TrendingDown, Users, ArrowRight, type LucideIcon,
} from "lucide-react";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { qs } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";
import { useLang } from "@/lib/i18n";

const typeIcon: Record<string, { icon: LucideIcon; label: string; ta: string }> = {
  member: { icon: Users, label: "Members", ta: "உறுப்பினர்கள்" },
  collection: { icon: HandCoins, label: "Collections", ta: "வரவு" },
  expense: { icon: TrendingDown, label: "Expenses", ta: "செலவு" },
  event: { icon: CalendarDays, label: "Events", ta: "நிகழ்வுகள்" },
};

interface Hit {
  type: keyof typeof typeIcon;
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  meta?: string;
  route: string;
}

/**
 * Remounts whenever the search is opened so query state starts fresh.
 */
export function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SearchPanel onClose={onClose} />;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const debouncedQ = useDebouncedValue(q, 220);
  const inputRef = useRef<HTMLInputElement>(null);

  const url = debouncedQ.trim().length > 0 ? `/api/search${qs({ q: debouncedQ })}` : null;
  const { data, loading } = useFetch<{ hits: Hit[] }>(url);
  const hits = useMemo(() => data?.hits ?? [], [data]);

  const go = useCallback(
    (route: string) => {
      onClose();
      router.push(route);
    },
    [onClose, router],
  );

  const submitActive = () => {
    const h = hits[active];
    if (h) go(h.route);
  };

  const grouped = useMemo(() => {
    const order: Hit["type"][] = ["member", "collection", "expense", "event"];
    return order
      .map((t) => ({ type: t, items: hits.filter((h) => h.type === t) }))
      .filter((g) => g.items.length > 0);
  }, [hits]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-navy-950/45 p-3 pt-[6dvh] backdrop-blur-[3px] sm:p-6 sm:pt-[8dvh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 400 }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-modal"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[18px] shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter") submitActive();
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            }}
            placeholder={t("Search members, collections, expenses, events…", "உறுப்பினர்கள், வரவு, செலவு, நிகழ்வுகள் தேடுங்கள்…")}
            autoFocus
            className="h-13 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-faint">
            ESC
          </kbd>
        </div>

        <div className="max-h-[52dvh] overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-1.5 px-2 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl px-2.5 py-2.5">
                  <div className="size-8 rounded-lg bg-line" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/3 rounded bg-line" />
                    <div className="h-2.5 w-1/4 rounded bg-line/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : q.trim() && hits.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <SearchX className="size-7 text-faint" />
              <p className="text-[13.5px] font-semibold">{t(`No results for “${q}”`, `“${q}” -க்கான முடிவுகள் இல்லை`)}</p>
              <p className="text-xs text-faint">{t("Try a name, receipt number or event", "பெயர், ரசீது எண் அல்லது நிகழ்வை முயற்சிக்கவும்")}</p>
            </div>
          ) : !q.trim() ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-semibold">{t("Search the Mandram", "மன்றத்தில் தேடுங்கள்")}</p>
              <p className="mt-1 text-xs text-faint">{t("Try “Ravi”, “NBM-2026” or “Pongal”", "“ரவி”, “NBM-2026” அல்லது “பொங்கல்” முயற்சிக்கவும்")}</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.type} className="mb-1.5">
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">
                  {(() => {
                    const Icon = typeIcon[group.type].icon;
                    return <Icon className="size-3" />;
                  })()}
                  {t(typeIcon[group.type].label, typeIcon[group.type].ta)}
                </p>
                {group.items.map((h, idx) => {
                  const globalIdx = hits.indexOf(h);
                  const Icon = typeIcon[h.type].icon;
                  return (
                    <motion.button
                      key={`${h.type}-${h.id}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, delay: Math.min(idx * 0.03, 0.2) }}
                      onMouseEnter={() => setActive(globalIdx)}
                      onClick={() => go(h.route)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        active === globalIdx ? "bg-surface-2" : "hover:bg-surface-2/60",
                      )}
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-500/15 dark:text-navy-200">
                        <Icon className="size-[17px]" />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13.5px] font-semibold">{h.title}</span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {h.subtitle}
                          {h.meta ? <span className="text-faint"> · {h.meta}</span> : null}
                        </span>
                      </span>
                      {h.amount !== undefined ? (
                        <span className="shrink-0 text-[13px] font-bold tabular-nums text-leaf-700 dark:text-leaf-400">
                          {formatINR(h.amount)}
                        </span>
                      ) : (
                        <ArrowRight className="size-4 shrink-0 text-faint" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="hidden items-center gap-3 border-t border-line bg-surface-2/60 px-4 py-2 text-[10.5px] font-medium text-faint sm:flex">
          <span><kbd className="rounded border border-line bg-surface px-1">↑</kbd><kbd className="ml-0.5 rounded border border-line bg-surface px-1">↓</kbd> {t("navigate", "நகர்த்து")}</span>
          <span><kbd className="rounded border border-line bg-surface px-1">↵</kbd> {t("open", "திற")}</span>
          <span className="ml-auto">⚡ {t("instant global search", "முழு மன்றத் தேடல்")}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
