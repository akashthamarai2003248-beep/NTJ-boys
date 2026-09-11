"use client";

import { motion } from "framer-motion";
import { HandCoins, TrendingDown, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLang } from "@/lib/i18n";

interface Stat {
  key: string;
  ta: string;
  en: string;
  icon: LucideIcon;
  value: number;
  prefix?: string;
  subtitle?: { en: string; ta: string };
  tone: "saffron" | "navy" | "leaf" | "gold";
}

const tones = {
  saffron: "bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-400",
  navy: "bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-300",
  leaf: "bg-leaf-100 text-leaf-700 dark:bg-leaf-500/15 dark:text-leaf-400",
  gold: "bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300",
};

function StatCard({ stat }: { stat: Stat; index: number }) {
  const { lang } = useLang();
  const primary = lang === "en" ? stat.en : stat.ta;
  const secondary = lang === "both" ? stat.en : null;
  const subText = stat.subtitle ? (lang === "ta" ? stat.subtitle.ta : stat.subtitle.en) : null;
  const formatted = stat.value.toLocaleString("en-IN");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="card-surface group rounded-2xl p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11", tones[stat.tone])}>
          <stat.icon className="size-4.5 sm:size-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-1 leading-none">
            <span className="truncate text-[12px] font-bold text-muted sm:text-[13px]">{primary}</span>
            {secondary ? (
              <span className="hidden truncate text-[10px] font-medium text-faint sm:block">{secondary}</span>
            ) : null}
          </p>
          <p className="mt-1.5 truncate text-[18px] font-black leading-tight tracking-tight tabular-nums sm:mt-2 sm:text-[24px]">
            {stat.prefix}
            <span>{formatted}</span>
          </p>
          {subText ? (
            <p className="mt-1 truncate text-[10.5px] font-semibold text-faint sm:text-[11px]">
              {subText}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function StatCards({ data }: { data: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
      {data.map((s, i) => (
        <StatCard key={s.key} stat={s} index={i} />
      ))}
    </div>
  );
}

export function makeStats(t: {
  varavu: number;
  selavu: number;
  balance: number;
  members: number;
  paidMembers?: number;
  paidCount?: number;
}): Stat[] {
  const paid = t.paidMembers ?? (t.varavu > 0 ? 1 : 0);
  const paidSub =
    paid === 1
      ? { en: "1 member paid", ta: "1 நபர் செலுத்தினார்" }
      : { en: `${paid} members paid`, ta: `${paid} நபர்கள் செலுத்தினர்` };

  return [
    {
      key: "varavu",
      ta: "வரவு",
      en: "Collections",
      icon: HandCoins,
      value: t.varavu,
      prefix: "₹",
      subtitle: paidSub,
      tone: "saffron",
    },
    {
      key: "selavu",
      ta: "செலவு",
      en: "Expenses",
      icon: TrendingDown,
      value: t.selavu,
      prefix: "₹",
      subtitle: { en: "Total spent", ta: "செலவு தொகை" },
      tone: "navy",
    },
    {
      key: "balance",
      ta: "கையிருப்பு",
      en: "Balance",
      icon: Wallet,
      value: t.balance,
      prefix: "₹",
      subtitle: { en: "Available fund", ta: "கையிருப்பு நிதி" },
      tone: "leaf",
    },
    {
      key: "members",
      ta: "செலுத்தியவர்கள்",
      en: "Paid Members",
      icon: Users,
      value: paid,
      subtitle:
        t.members >= paid
          ? { en: `of ${t.members} members`, ta: `${t.members} உறுப்பினர்களில்` }
          : { en: `${t.paidCount ?? paid} contributions`, ta: `${t.paidCount ?? paid} வரவுகள்` },
      tone: "gold",
    },
  ];
}
