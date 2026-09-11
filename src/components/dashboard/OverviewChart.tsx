"use client";

import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Waves } from "lucide-react";
import type { SeriesBucket } from "@/lib/data/repository";
import { formatINR } from "@/lib/utils/money";
import { Segmented } from "@/components/ui/Segmented";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

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
  const varavuVal = payload.find((p) => p.dataKey === "varavu")?.value ?? 0;
  const selavuVal = payload.find((p) => p.dataKey === "selavu")?.value ?? 0;
  const net = varavuVal - selavuVal;

  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 shadow-pop backdrop-blur-md">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[12px] font-semibold tabular-nums">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.dataKey === "varavu" ? t("Varavu", "வரவு") : t("Selavu", "செலவு")}</span>
          <span className="ml-auto pl-3 font-bold text-ink">{formatINR(p.value)}</span>
        </p>
      ))}
      {varavuVal > 0 || selavuVal > 0 ? (
        <div className="mt-1.5 flex items-center justify-between border-t border-line/70 pt-1.5 text-[11px] font-bold">
          <span className="text-faint">{t("Net", "நிகரம்")}</span>
          <span className={net >= 0 ? "text-leaf-600 dark:text-leaf-400" : "text-red-500"}>
            {net >= 0 ? `+${formatINR(net)}` : formatINR(net)}
          </span>
        </div>
      ) : null}
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
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const { t } = useLang();

  const { varavuSum, selavuSum, maxPoint } = useMemo(() => {
    let vSum = 0;
    let sSum = 0;
    let max = 0;
    let peakLabel = "";
    for (const b of data) {
      vSum += b.varavu;
      sSum += b.selavu;
      if (b.varavu > max) {
        max = b.varavu;
        peakLabel = b.label;
      }
    }
    return {
      varavuSum: vSum,
      selavuSum: sSum,
      maxPoint: { max, label: peakLabel },
    };
  }, [data]);

  const netBalance = varavuSum - selavuSum;

  const renderVaravuDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.varavu <= 0) return null;
    return (
      <g key={`v-dot-${props.index}`}>
        <circle cx={cx} cy={cy} r={5} fill="#f59e2e" stroke="var(--surface)" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={9} fill="#f59e2e" fillOpacity={0.25} />
      </g>
    );
  };

  const renderSelavuDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.selavu <= 0) return null;
    return (
      <g key={`s-dot-${props.index}`}>
        <circle cx={cx} cy={cy} r={4.5} fill="#5579c1" stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="card-surface w-full min-w-0 max-w-full overflow-hidden rounded-2xl p-4 sm:p-5"
    >
      {/* Header with Title and Controls */}
      <div className="flex w-full min-w-0 max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-extrabold tracking-tight">{t("Varavu vs Selavu", "வரவு vs செலவு")}</h2>
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-faint">
              {chartType === "area" ? t("Trend", "போக்கு") : t("Bars", "பட்டை")}
            </span>
          </div>
          <p className="truncate text-[12px] font-medium text-muted">{t("income vs spending", "வருமானம் vs செலவு")}</p>
        </div>

        <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* Chart style toggle (Wave / Bars) */}
          <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setChartType("area")}
              title={t("Wave view", "அலை பார்வை")}
              aria-label="Wave chart"
              className={cn(
                "flex size-7 items-center justify-center rounded-[9px] transition-all",
                chartType === "area" ? "bg-surface text-saffron-600 shadow-sm dark:text-saffron-400" : "text-faint hover:text-ink",
              )}
            >
              <Waves className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              title={t("Bar view", "பட்டை பார்வை")}
              aria-label="Bar chart"
              className={cn(
                "flex size-7 items-center justify-center rounded-[9px] transition-all",
                chartType === "bar" ? "bg-surface text-saffron-600 shadow-sm dark:text-saffron-400" : "text-faint hover:text-ink",
              )}
            >
              <BarChart2 className="size-3.5" />
            </button>
          </div>

          {/* Period tabs */}
          <div className="min-w-0 flex-1 sm:w-auto sm:flex-initial">
            <Segmented
              value={period}
              onChange={onPeriodChange}
              options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: t(o.label, o.ta) }))}
              className="w-full sm:w-auto justify-between"
            />
          </div>
        </div>
      </div>

      {/* Summary Legend Strip with glow effects */}
      <div className="mt-3 flex w-full min-w-0 max-w-full flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-[11.5px] font-semibold">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5 sm:gap-3.5">
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="size-2.5 rounded-[4px] bg-saffron-500 shadow-[0_0_8px_rgba(245,158,46,0.6)]" />
            <span className="text-muted">{t("Varavu", "வரவு")}</span>
            <span className="font-extrabold tabular-nums text-ink">{formatINR(varavuSum)}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <span className="size-2.5 rounded-[4px] bg-navy-500 shadow-[0_0_8px_rgba(85,121,193,0.6)]" />
            <span className="text-muted">{t("Selavu", "செலவு")}</span>
            <span className="font-extrabold tabular-nums text-ink">{formatINR(selavuSum)}</span>
          </span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums",
              netBalance >= 0 ? "bg-leaf-500/10 text-leaf-600 dark:text-leaf-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
            )}
          >
            {netBalance >= 0 ? `+${formatINR(netBalance)}` : formatINR(netBalance)}
          </span>
        </div>

        {maxPoint.max > 0 ? (
          <div className="hidden text-[11px] font-medium text-faint md:block">
            <span>{t("Peak", "உச்சம்")}: </span>
            <span className="font-bold text-saffron-600 dark:text-saffron-400">{formatINR(maxPoint.max)}</span>
            <span className="text-faint"> ({maxPoint.label})</span>
          </div>
        ) : null}
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-3 h-56 w-full min-w-0 max-w-full overflow-hidden sm:h-60">
        {loading && (!data || data.length === 0) ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-40 w-full animate-pulse rounded-xl bg-surface-2" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={chartType}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.6 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full min-w-0 max-w-full overflow-hidden"
            >
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={data} margin={{ top: 12, right: 12, left: -4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="varavuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e2e" stopOpacity={0.48} />
                        <stop offset="65%" stopColor="#f59e2e" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#f59e2e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="selavuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5579c1" stopOpacity={0.42} />
                        <stop offset="65%" stopColor="#5579c1" stopOpacity={0.10} />
                        <stop offset="100%" stopColor="#5579c1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--line)" opacity={0.65} />
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
                      width={40}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ stroke: "var(--line-strong)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="varavu"
                      stroke="#f59e2e"
                      strokeWidth={2.8}
                      fillOpacity={1}
                      fill="url(#varavuGrad)"
                      dot={renderVaravuDot}
                      activeDot={{ r: 6.5, fill: "#f59e2e", stroke: "var(--surface)", strokeWidth: 2.5 }}
                      isAnimationActive={true}
                      animationDuration={250}
                      animationEasing="ease-out"
                    />
                    <Area
                      type="monotone"
                      dataKey="selavu"
                      stroke="#5579c1"
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill="url(#selavuGrad)"
                      dot={renderSelavuDot}
                      activeDot={{ r: 5.5, fill: "#5579c1", stroke: "var(--surface)", strokeWidth: 2.5 }}
                      isAnimationActive={true}
                      animationDuration={250}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={data} margin={{ top: 12, right: 12, left: -4, bottom: 0 }} barCategoryGap="24%">
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--line)" opacity={0.65} />
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
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)", opacity: 0.6 }} />
                    <Bar
                      dataKey="varavu"
                      fill="#f59e2e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={period === "month" ? 10 : 26}
                      isAnimationActive={true}
                      animationDuration={250}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="selavu"
                      fill="#5579c1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={period === "month" ? 10 : 26}
                      isAnimationActive={true}
                      animationDuration={250}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
