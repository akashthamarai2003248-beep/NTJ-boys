"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/i18n";

export function PageHeader({
  title,
  ta,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  ta?: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  const { lang } = useLang();
  // English mode: English title. Tamil mode: Tamil title (falls back to
  // English). Combined: Tamil leads, English follows — per product choice.
  const heading =
    lang === "en" ? title : lang === "ta" ? (ta?.trim() ? ta : title) : ta?.trim() ? `${ta} · ${title}` : title;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-3 sm:gap-6"
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-saffron-600 dark:text-saffron-400">{eyebrow}</p> : null}
        <h1 className="text-[20px] font-extrabold tracking-tight text-ink sm:text-2xl">
          {heading}
        </h1>
        {subtitle ? <p className="mt-0.5 line-clamp-1 text-[12px] text-muted sm:line-clamp-none sm:text-[13px]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </motion.div>
  );
}
