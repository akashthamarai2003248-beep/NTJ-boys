"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, Settings } from "lucide-react";
import { MORE_ITEMS, type NavItem } from "@/lib/nav";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import { usePermissions, useSession } from "./session";
import { useLang } from "@/lib/i18n";
import { useBodyScrollLock, prefetchRoute } from "@/lib/client/hooks";

function Row({ item, onClose, suffix }: { item: NavItem; onClose: () => void; suffix?: React.ReactNode }) {
  const { lang } = useLang();
  const Icon = item.icon;
  const primary = lang === "en" ? item.en : item.ta;
  const secondary = lang === "both" ? item.en : null;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      onMouseEnter={() => prefetchRoute(item.href)}
      onTouchStart={() => prefetchRoute(item.href)}
      onPointerDown={() => prefetchRoute(item.href)}
      aria-label={item.en}
      className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors active:scale-[0.99] hover:bg-surface-2"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-navy-700 dark:bg-navy-500/15 dark:text-navy-200">
        <Icon className="size-5" />
      </span>
      <span className="flex-1 leading-tight">
        <span className="block text-[14px] font-bold">{primary}</span>
        {secondary ? <span className="text-[11.5px] font-medium text-faint">{secondary}</span> : null}
      </span>
      {suffix}
      <ChevronRight className="size-4 text-faint" />
    </Link>
  );
}

export function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useSession();
  const { role } = usePermissions();
  const { lang, t } = useLang();

  // Prevent background page scrolling & touch contention on mobile while sheet is open
  useBodyScrollLock(open);

  const roleLabel =
    role === "admin" ? t("Administrator", "நிர்வாகி") : role === "treasurer" ? t("Treasurer", "பொருளாளர்") : t("Member", "உறுப்பினர்");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Smooth hardware-accelerated dark scrim without heavy backdrop-filter blur that lags on mobile */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Hardware-accelerated GPU slide-up sheet with native swipe-to-dismiss */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 65 || info.velocity.y > 350) {
                onClose();
              }
            }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] touch-pan-y overflow-y-auto rounded-t-3xl border-t border-line bg-surface pb-[calc(2rem+env(safe-area-inset-bottom))] text-ink shadow-modal transform-gpu will-change-transform"
          >
            {/* Grab handle indicator */}
            <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line/80" />
            <div className="px-5 pt-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {user && <Avatar name={user.name} size="lg" />}
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold leading-tight">{user?.name}</p>
                    <p className="truncate text-[11.5px] font-semibold text-muted">
                      {roleLabel} · {t("Nethaji Boys Mandram", "நேதாஜி பாய்ஸ் மன்றம்")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void signOut()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] font-semibold text-muted active:scale-95"
                >
                  <LogOut className="size-3.5" /> {t("Exit", "வெளியேறு")}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-0.5 px-3">
              {MORE_ITEMS.map((item) => (
                <Row key={item.id} item={item} onClose={onClose} />
              ))}
              <Row
                item={{ id: "settings", en: "Settings", ta: "அமைப்புகள்", href: "/settings", icon: Settings } as NavItem}
                onClose={onClose}
              />
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 pb-1 text-[10.5px] font-semibold text-faint">
              <LogoMark className="size-5" />
              {t("NETHAJI BOYS MANDRAM · transparent", "நேதாஜி பாய்ஸ் மன்றம் · வெளிப்படைத்தன்மையுடன்")}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
