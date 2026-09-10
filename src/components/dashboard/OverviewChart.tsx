"use client";

import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { motion } from "framer-motion";
import type { SeriesBucket } from "@/lib/data/repository";
import { formatINR } from "@/lib/utils/money";
import { Segmented } from "@/components/ui/Segmented";
import { useLang } from "@/lib/i18n";

export type PeriodKey = "week" | "month" | "year" | "all";

const PERIOD_OPTIONS: { value: PeriodKey; label: string; ta: string }[] = [
  { value: "week", label: "Week", ta: "வாரம்" },
  { value: "month", label: "Month", ta: "மாதம்" },
  { value: "year", label: "Year", ta: "ஆண்டு" },
  { value: "all", label: "All", ta: "அனைத்தும்" },
];

const compact = (n: number) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(n % 10000000 ? 1 : 0)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k`;
  return `${n}`;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color?: string }[];
  label?: string;
}) {
  const { t } = useLang();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-pop">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[12.5px] font-semibold tabular-nums">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.dataKey === "varavu" ? t("Varavu", "வரவு") : t("Selavu", "செலவு")}
          <span className="ml-auto pl-3">{formatINR(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function OverviewChart({
  period,
  onPeriodChange,
  data,
  loading,
}: {
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  data: SeriesBucket[];
  loading: boolean;
}) {
  const { varavuSum, selavuSum } = useMemo(
    () => ({
      varavuSum: data.reduce((s, b) => s + b.varavu, 0),
      selavuSum: data.reduce((s, b) => s + b.selavu, 0),
    }),
    [data],
  );
  const { t } = useLang();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12 }}
      className="card-surface rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold tracking-tight">{t("Varavu vs Selavu", "வரவு vs செலவு")}</h2>
          <p className="truncate text-[12px] font-medium text-muted">{t("income vs spending", "வருமானம் vs செலவு")}</p>
        </div>
        <div className="w-full sm:w-auto">
          <Segmented
            value={period}
            onChange={onPeriodChange}
            options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: t(o.label, o.ta) }))}
            className="w-full sm:w-auto justify-between"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11.5px] font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-saffron-500" /> {t("Varavu", "வரவு")} {formatINR(varavuSum)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-navy-500" /> {t("Selavu", "செலவு")} {formatINR(selavuSum)}
        </span>
      </div>

      <div className="mt-3 h-56 w-full min-w-0 overflow-hidden sm:h-60">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-40 w-full animate-pulse rounded-xl bg-surface-2" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10.5, fill: "var(--faint)", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={14}
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: "var(--faint)", fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={compact}
                width={54}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)", opacity: 0.6 }} />
              <Bar dataKey="varavu" fill="#f59e2e" radius={[5, 5, 0, 0]} maxBarSize={22} />
              <Bar dataKey="selavu" fill="#5579c1" radius={[5, 5, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
