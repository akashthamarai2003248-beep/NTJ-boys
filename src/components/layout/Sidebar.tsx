"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut, Settings } from "lucide-react";
import { NAV_ITEMS, SETTINGS_ITEM } from "@/lib/nav";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";
import { prefetchRoute, prefetchCoreRoutes } from "@/lib/client/hooks";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { useSession } from "./session";
import { Badge } from "@/components/ui/Badge";

function NavRow({
  href,
  en,
  ta,
  icon: Icon,
  active,
  phase2,
  onNavigate,
}: {
  href: string;
  en: string;
  ta: string;
  icon: typeof NAV_ITEMS[number]["icon"];
  active: boolean;
  phase2?: boolean;
  onNavigate?: () => void;
}) {
  const { lang } = useLang();
  const primary = lang === "en" ? en : ta;
  const secondary = lang === "both" ? en : null; // Tamil leads in both mode

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={onNavigate}
      onPointerDown={() => {
        onNavigate?.();
        prefetchRoute(href);
      }}
      onMouseEnter={() => prefetchRoute(href)}
      onTouchStart={() => {
        onNavigate?.();
        prefetchRoute(href);
      }}
      aria-label={lang === "en" ? en : `${ta} · ${en}`}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors duration-150",
        active ? "bg-surface text-ink shadow-card" : "text-muted hover:bg-surface-2/80 hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-saffron-500"
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
        />
      )}
      <Icon
        className={cn("size-[19px] shrink-0 transition-colors", active ? "text-saffron-600 dark:text-saffron-400" : "text-faint group-hover:text-muted")}
        strokeWidth={2}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight">{primary}</span>
        {secondary ? (
          <span className="block truncate text-[11px] font-medium text-faint">{secondary}</span>
        ) : null}
      </span>
      {phase2 ? (
        <Badge tone="gold" className="px-1.5 py-0 text-[9.5px] uppercase tracking-wide">
          Soon
        </Badge>
      ) : null}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useSession();
  const { lang, t } = useLang();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Sync back to real pathname on page transition
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Safety fallback: reset pending state if route transition is aborted
  useEffect(() => {
    if (!pendingHref) return;
    const timer = setTimeout(() => setPendingHref(null), 2500);
    return () => clearTimeout(timer);
  }, [pendingHref]);

  // Eagerly prefetch route chunks and core data on desktop mount
  useEffect(() => {
    [...NAV_ITEMS, SETTINGS_ITEM].forEach((item) => {
      try {
        router.prefetch(item.href);
      } catch {
        // safe catch
      }
      prefetchRoute(item.href);
    });
    prefetchCoreRoutes();
  }, [router]);

  const currentActive = pendingHref ?? pathname;
  const isActive = (href: string) => (href === "/" ? currentActive === "/" : currentActive.startsWith(href));

  const roleLabel =
    user?.role === "admin"
      ? t("Admin", "நிர்வாகி")
      : user?.role === "treasurer"
        ? t("Treasurer", "பொருளாளர்")
        : t("Member", "உறுப்பினர்");

  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-surface-2/60 px-3.5 py-5 lg:flex">
      <div className="px-2 pb-5">
        <Logo />
      </div>
      <nav className="hide-scrollbar flex-1 space-y-1 overflow-y-auto pr-0.5" aria-label={lang === "en" ? "Primary" : "முதன்மை"}>
        {NAV_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            {...item}
            active={isActive(item.href)}
            onNavigate={() => setPendingHref(item.href)}
          />
        ))}
      </nav>

      <div className="mt-3 space-y-1 border-t border-line pt-3">
        <NavRow
          {...SETTINGS_ITEM}
          active={isActive(SETTINGS_ITEM.href)}
          onNavigate={() => setPendingHref(SETTINGS_ITEM.href)}
        />
      </div>

      {user && (
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5 shadow-card">
          <Avatar name={user.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold leading-tight">{user.name}</p>
            <p className="truncate text-[11px] font-medium capitalize text-muted">{roleLabel}</p>
          </div>
          <button
            onClick={() => void signOut()}
            aria-label={t("Sign out", "வெளியேறு")}
            title={t("Sign out", "வெளியேறு")}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      )}
      {!user && <div className="mt-3 flex justify-center"><Settings className="size-4 animate-spin text-faint" /></div>}
    </aside>
  );
}
