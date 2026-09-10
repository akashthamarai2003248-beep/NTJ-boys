"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, Settings } from "lucide-react";
import { MORE_ITEMS, type NavItem } from "@/lib/nav";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import { usePermissions, useSession } from "./session";
import { useLang } from "@/lib/i18n";

function Row({ item, onClose, suffix }: { item: NavItem; onClose: () => void; suffix?: React.ReactNode }) {
  const { lang } = useLang();
  const Icon = item.icon;
  const primary = lang === "en" ? item.en : item.ta;
  const secondary = lang === "both" ? item.en : null;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-label={item.en}
      className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-surface-2"
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

  const roleLabel =
    role === "admin" ? t("Administrator", "நிர்வாகி") : role === "treasurer" ? t("Treasurer", "பொருளாளர்") : t("Member", "உறுப்பினர்");

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <motion.div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 350 }}
            className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface pb-[calc(2rem+env(safe-area-inset-bottom))] text-ink shadow-modal"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
            <div className="px-5 pt-4">
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
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[12px] font-semibold text-muted"
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
