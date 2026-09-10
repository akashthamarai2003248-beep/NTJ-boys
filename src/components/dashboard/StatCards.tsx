"use client";

import { motion } from "framer-motion";
import { HandCoins, TrendingDown, Users, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCountUp } from "@/components/shared/count-up";
import { useLang } from "@/lib/i18n";

interface Stat {
  key: string;
  ta: string;
  en: string;
  icon: LucideIcon;
  value: number;
  prefix?: string;
  tone: "saffron" | "navy" | "leaf" | "gold";
}

const tones = {
  saffron: "bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-400",
  navy: "bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-300",
  leaf: "bg-leaf-100 text-leaf-700 dark:bg-leaf-500/15 dark:text-leaf-400",
  gold: "bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300",
};

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const { ref, display } = useCountUp(stat.value, 1.05 + index * 0.08);
  const { lang } = useLang();
  const primary = lang === "en" ? stat.en : stat.ta;
  const secondary = lang === "both" ? stat.en : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="card-surface group rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-11", tones[stat.tone])}>
          <stat.icon className="size-5" strokeWidth={2.1} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-2 leading-none">
            <span className="truncate text-[12.5px] font-bold sm:text-[13px]">{primary}</span>
            {secondary ? (
              <span className="hidden truncate text-[10.5px] font-medium text-faint sm:block">{secondary}</span>
            ) : null}
          </p>
          <p className="mt-2 truncate text-[20px] font-black leading-none tracking-tight tabular-nums sm:text-[24px]">
            {stat.prefix}
            <span ref={ref}>{display}</span>
          </p>
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

export function makeStats(t: { varavu: number; selavu: number; balance: number; members: number }): Stat[] {
  return [
    { key: "varavu", ta: "மொத்த வரவு", en: "Total Collection", icon: HandCoins, value: t.varavu, prefix: "₹", tone: "saffron" },
    { key: "selavu", ta: "மொத்த செலவு", en: "Total Expenses", icon: TrendingDown, value: t.selavu, prefix: "₹", tone: "navy" },
    { key: "balance", ta: "கையிருப்பு", en: "Balance", icon: Wallet, value: t.balance, prefix: "₹", tone: "leaf" },
    { key: "members", ta: "உறுப்பினர்கள்", en: "Members", icon: Users, value: t.members, tone: "gold" },
  ];
}
