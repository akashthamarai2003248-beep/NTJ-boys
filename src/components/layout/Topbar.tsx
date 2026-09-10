"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/ui/Logo";
import { useSession } from "./session";
import { langShort, useLang, type Lang } from "@/lib/i18n";

const CYCLE: Lang[] = ["en", "ta", "both"];

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useSession();
  const { lang, setLang, t } = useLang();
  const dark = resolvedTheme === "dark";

  const roleName =
    user?.role === "admin"
      ? t("Administrator", "நிர்வாகி")
      : user?.role === "treasurer"
        ? t("Treasurer", "பொருளாளர்")
        : t("Member", "உறுப்பினர்");

  const nextLang = (): Lang => {
    const i = CYCLE.indexOf(lang);
    return CYCLE[(i + 1) % CYCLE.length];
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-2.5 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <Logo markOnly compact />
          <div className="leading-none">
            <p className="text-[12.5px] font-extrabold tracking-[0.02em]">NETHAJI&nbsp;BOYS</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.28em] text-saffron-600 dark:text-saffron-400">
              {lang === "ta" ? "மன்றம்" : lang === "both" ? "மன்றம் · Mandram" : "Mandram"}
            </p>
          </div>
        </div>

        <div className="flex-1 sm:hidden" />

        <button
          onClick={onOpenSearch}
          aria-label={t("Search", "தேடு")}
          className="group flex h-10 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-ink max-sm:size-10 max-sm:shrink-0 sm:min-w-0 sm:flex-1 sm:justify-start sm:gap-2.5 sm:px-3.5 sm:text-[13px] sm:text-faint sm:hover:border-navy-300 sm:max-w-md lg:max-w-lg"
        >
          <Search className="size-4 shrink-0" />
          <span className="hidden truncate sm:inline">
            {t("Search members, receipts, events…", "உறுப்பினர்கள், ரசீதுகள், நிகழ்வுகள் தேடுங்கள்…")}
          </span>
          <kbd className="ml-auto hidden shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-faint sm:block">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => setLang(nextLang())}
          aria-label={t("Language", "மொழி")}
          title={`${t("Language", "மொழி")}: ${langShort(nextLang())}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-[10px] font-extrabold tracking-wide text-muted transition-colors hover:text-ink"
        >
          {langShort(lang)}
        </button>

        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label={t("Toggle theme", "தீம் மாற்று")}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-ink"
        >
          {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        {user ? (
          <div className="hidden shrink-0 items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-3.5 sm:flex">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-navy-700 to-navy-900 text-[11px] font-extrabold text-white dark:from-saffron-500 dark:to-saffron-600">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <div className="leading-tight">
              <p className="max-w-24 truncate text-[12px] font-bold">{user.name.split(" ")[0]}</p>
              <p className="text-[10px] font-semibold capitalize text-muted">{roleName}</p>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
