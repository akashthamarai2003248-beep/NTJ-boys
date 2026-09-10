"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  FileText,
  PieChart,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReportsData } from "@/lib/data/repository";
import { useFetch } from "@/lib/client/hooks";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentLabel } from "@/components/shared/meta";
import { eventTypeMeta } from "@/components/shared/meta";
import { formatINR, formatNumber } from "@/lib/utils/money";
import { Segmented } from "@/components/ui/Segmented";
import { useCountUp } from "@/components/shared/count-up";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

export function ReportsView() {
  const [year, setYear] = useState<string>("all");
  const { data, loading } = useFetch<ReportsData>(`/api/reports?year=${year}`);
  const [printing, setPrinting] = useState(false);
  const { t } = useLang();

  const currentYear = String(new Date().getFullYear());

  const exportCSV = () => {
    if (!data) return;
    const rows: (string | number)[][] = [];
    const sec = (txt: string) => rows.push([txt]);

    rows.push(["NETHAJI BOYS MANDRAM", "நேதாஜி பாய்ஸ் மன்றம்", ""]);
    rows.push(["Financial report", `நிதி அறிக்கை — ${data.year === "all" ? "All time" : data.year}`, ""]);
    rows.push([]);
    sec("Financial summary · நிதி சுருக்கம்");
    rows.push(["Metric", "Tamil", "Amount (INR)"]);
    rows.push(["Total Collection", "மொத்த வரவு", data.totals.varavu]);
    rows.push(["Total Expenses", "மொத்த செலவு", data.totals.selavu]);
    rows.push(["Balance", "கையிருப்பு", data.totals.balance]);
    rows.push([]);
    sec("Event wise · நிகழ்வு வாரியாக");
    rows.push(["Event", "Collection", "Expenses"]);
    for (const e of data.byEvent) rows.push([e.name, e.varavu, e.selavu]);
    rows.push([]);
    sec("Payment method · பணம் செலுத்தும் முறை");
    rows.push(["Method", "Collection", "Expenses"]);
    for (const m of data.byMethod) rows.push([m.label, m.varavu, m.selavu]);
    rows.push([]);
    sec("Expense categories · செலவு வகை");
    rows.push(["Category", "Amount", "Count"]);
    for (const c of data.byCategory) rows.push([c.category, c.amount, c.count]);
    rows.push([]);
    sec("Top donors · முக்கிய நன்கொடையாளர்கள்");
    rows.push(["Name", "Total", "Count"]);
    for (const d of data.topDonors) rows.push([d.name, d.total, d.count]);

    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nbm-report-${data.year === "all" ? "alltime" : data.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel (.csv) downloaded — opens in Excel / Sheets");
  };

  const printPDF = () => {
    setPrinting(true);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => setPrinting(false), 300);
    }, 80);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={t("REPORTS · Financial Audit", "அறிக்கைகள் · நிதி தணிக்கை")}
        title={t("Financial Reports", "நிதி அறிக்கைகள்")}
        ta="அறிக்கைகள் · transparent by design"
        subtitle={t(
          "Computed live from the ledger — Varavu minus Selavu is always the balance",
          "கணக்கேட்டிலிருந்து நேரடி கணக்கீடு — வரவு கழித்தல் செலவு கையிருப்பாகும்",
        )}
        actions={
          data ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={exportCSV} className="rounded-xl">
                <FileSpreadsheet className="size-4" /> {t("Excel (.csv)", "எக்செல்")}
              </Button>
              <Button size="sm" variant="primary" onClick={printPDF} className="rounded-xl">
                <FileText className="size-4" /> {t("Export PDF", "பி.டி.எஃப்")}
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Period Filter Card */}
      <div className="card-surface flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl p-3.5 sm:p-4">
        <p className="flex items-center gap-2 text-[13px] font-bold text-muted">
          <BarChart3 className="size-4 text-saffron-600 dark:text-saffron-400" />
          <span>{t("Report Period", "அறிக்கை காலம்")}</span>
        </p>
        <div className="w-full sm:w-auto">
          <Segmented
            value={year}
            onChange={setYear}
            options={[
              { value: "all", label: t("All time", "அனைத்தும்") },
              { value: currentYear, label: `${currentYear} (${t("This year", "நடப்பு ஆண்டு")})` },
            ]}
            className="w-full sm:w-auto justify-between"
          />
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : !data ? (
        <div className="card-surface rounded-2xl">
          <EmptyState icon={BarChart3} title="Could not build the report" message="Try again in a moment." />
        </div>
      ) : (
        <ReportBody data={data} />
      )}

      {/* Hidden printable copy */}
      {printing && typeof document !== "undefined"
        ? createPortal(<PrintReport data={data!} />, document.body)
        : null}
    </div>
  );
}

const toneStyles = {
  saffron: {
    border: "border-saffron-500/30 hover:border-saffron-500/50",
    bg: "bg-gradient-to-br from-saffron-500/10 via-surface to-surface",
    iconBg: "bg-saffron-500/15 text-saffron-600 dark:text-saffron-400",
    glow: "shadow-[0_0_20px_-8px_rgba(245,158,46,0.3)]",
  },
  navy: {
    border: "border-navy-500/30 hover:border-navy-500/50",
    bg: "bg-gradient-to-br from-navy-500/10 via-surface to-surface",
    iconBg: "bg-navy-500/15 text-navy-600 dark:text-navy-300",
    glow: "shadow-[0_0_20px_-8px_rgba(85,121,193,0.3)]",
  },
  leaf: {
    border: "border-leaf-500/30 hover:border-leaf-500/50",
    bg: "bg-gradient-to-br from-leaf-500/10 via-surface to-surface",
    iconBg: "bg-leaf-500/15 text-leaf-600 dark:text-leaf-400",
    glow: "shadow-[0_0_20px_-8px_rgba(49,167,108,0.3)]",
  },
  red: {
    border: "border-red-500/30 hover:border-red-500/50",
    bg: "bg-gradient-to-br from-red-500/10 via-surface to-surface",
    iconBg: "bg-red-500/15 text-red-600 dark:text-red-400",
    glow: "shadow-[0_0_20px_-8px_rgba(239,68,68,0.3)]",
  },
};

function SummaryCard({
  label,
  sub,
  value,
  tone,
  icon: Icon,
  index,
}: {
  label: string;
  sub: string;
  value: number;
  tone: "saffron" | "navy" | "leaf" | "red";
  icon: LucideIcon;
  index: number;
}) {
  const { ref, display } = useCountUp(value, 1.05 + index * 0.08);
  const style = toneStyles[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5",
        style.border,
        style.bg,
        style.glow,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted sm:text-[12px]">
            {label}
          </p>
          <p className="mt-2 text-[22px] font-black leading-tight tracking-tight tabular-nums text-ink sm:text-[26px]">
            ₹<span ref={ref}>{display}</span>
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-faint sm:text-[11.5px]">
            {sub}
          </p>
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105", style.iconBg)}>
          <Icon className="size-5" strokeWidth={2.2} />
        </div>
      </div>
    </motion.div>
  );
}

function MiniMetric({
  label,
  value,
  sub,
  icon: Icon,
  index,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: LucideIcon;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
      className="card-surface group rounded-2xl p-3 sm:p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="flex items-center justify-center gap-1.5 text-faint">
        <Icon className="size-3.5" />
        <p className="truncate text-[10.5px] font-bold uppercase tracking-wider text-muted">{label}</p>
      </div>
      <p className="mt-1.5 truncate text-[20px] font-black tabular-nums tracking-tight text-ink sm:text-[24px]">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 truncate text-[10.5px] font-medium text-faint">
          {sub}
        </p>
      ) : null}
    </motion.div>
  );
}

function ReportBody({ data }: { data: ReportsData }) {
  const t = data.totals;
  const { t: translate } = useLang();

  const paidMembersCount = t.paidMembers ?? (t.varavu > 0 ? 1 : 0);
  const paidText =
    paidMembersCount === 1
      ? translate("1 member contributed", "1 நபர் செலுத்தியுள்ளார்")
      : translate(`${paidMembersCount} members contributed`, `${paidMembersCount} நபர்கள் செலுத்தியுள்ளனர்`);

  // Financial efficiency stats
  const totalFlow = t.varavu + t.selavu;
  const varavuPct = totalFlow > 0 ? Math.round((t.varavu / totalFlow) * 100) : 0;
  const selavuPct = totalFlow > 0 ? Math.round((t.selavu / totalFlow) * 100) : 0;
  const retentionRate = t.varavu > 0 ? Math.max(0, Math.round((t.balance / t.varavu) * 100)) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 3 Main Financial Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <SummaryCard
          label={translate("Total Collections", "மொத்த வரவு")}
          sub={paidText}
          value={t.varavu}
          tone="saffron"
          icon={ArrowUpRight}
          index={0}
        />
        <SummaryCard
          label={translate("Total Expenses", "மொத்த செலவு")}
          sub={translate("Spent on mandram & events", "மன்றம் மற்றும் நிகழ்வு செலவுகள்")}
          value={t.selavu}
          tone="navy"
          icon={ArrowDownRight}
          index={1}
        />
        <SummaryCard
          label={translate("Net Balance", "கையிருப்பு")}
          sub={translate("Available surplus in fund", "கையிருப்பில் உள்ள நிதி")}
          value={t.balance}
          tone={t.balance >= 0 ? "leaf" : "red"}
          icon={Wallet}
          index={2}
        />
      </div>

      {/* 3 Mini Metrics Cards (Paid Members, Receipts, Expenses) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <MiniMetric
          label={translate("Paid Members", "செலுத்தியோர்")}
          value={paidMembersCount}
          sub={translate("Contributors", "நன்கொடையாளர்")}
          icon={Users}
          index={0}
        />
        <MiniMetric
          label={translate("Receipts", "ரசீதுகள்")}
          value={t.collectionCount}
          sub={translate("Collections", "வரவு பதிவுகள்")}
          icon={Receipt}
          index={1}
        />
        <MiniMetric
          label={translate("Expense Entries", "செலவுகள்")}
          value={t.expenseCount}
          sub={translate("Bills recorded", "செலவு ரசீதுகள்")}
          icon={FileText}
          index={2}
        />
      </div>

      {/* Cashflow Efficiency Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="card-surface rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[14.5px] font-extrabold tracking-tight">
              {translate("Financial Retention Rate", "நிதி பயன்பாட்டு விகிதம்")}
            </h3>
            <p className="text-[12px] font-medium text-muted">
              {translate("Collection retention vs total spending", "மொத்த வரவு மற்றும் செலவு விகிதம்")}
            </p>
          </div>
          <span className="rounded-xl bg-leaf-500/10 px-2.5 py-1 text-[11.5px] font-bold text-leaf-600 dark:text-leaf-400">
            {retentionRate}% {translate("Retained in Fund", "சேமிப்பு")}
          </span>
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-2 p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${varavuPct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-400 shadow-[0_0_10px_rgba(245,158,46,0.4)]"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 text-saffron-600 dark:text-saffron-400">
              <span className="size-2 rounded-full bg-saffron-500" />
              {translate("Collections", "வரவு")}: {formatINR(t.varavu)} ({varavuPct}%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-navy-600 dark:text-navy-300">
              <span className="size-2 rounded-full bg-navy-500" />
              {translate("Expenses", "செலவு")}: {formatINR(t.selavu)} ({selavuPct}%)
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Event-wise Breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="card-surface overflow-hidden rounded-2xl"
        >
          <Header title={translate("Event-wise · நிகழ்வு வாரியாக", "நிகழ்வு வாரியாக · Event-wise")} />
          <div className="divide-y divide-line">
            {data.byEvent.map((e) => {
              const isGeneral = e.id === "__general";
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5 transition-colors hover:bg-surface-2/60">
                  <span className="shrink-0 text-xl">{isGeneral ? "🎯" : eventTypeMeta(e.type).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold sm:text-[13.5px]">{e.name}</p>
                    <p className="truncate text-[11px] font-medium text-faint">
                      {isGeneral ? translate("General mandram fund", "பொது நிதி") : (e.tamilName || "")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-[11.5px] leading-tight">
                    <p className="font-bold tabular-nums text-leaf-600 dark:text-leaf-400">{formatINR(e.varavu)}</p>
                    <p className="tabular-nums text-muted">− {formatINR(e.selavu)}</p>
                  </div>
                  <div className="w-20 shrink-0 text-right sm:w-24">
                    <span className={cn(
                      "inline-block rounded-md px-1.5 py-0.5 text-[11.5px] sm:text-[12px] font-extrabold tabular-nums",
                      e.balance >= 0 ? "bg-leaf-500/10 text-leaf-600 dark:text-leaf-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
                    )}>
                      {formatINR(e.balance)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Payment Methods Breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.4 }}
          className="card-surface rounded-2xl p-4 sm:p-5"
        >
          <Header title={translate("Payment Methods · பண முறைகள்", "பண முறைகள் · Payment Methods")} />
          <div className="mt-4 space-y-3.5">
            {data.byMethod.map((m, idx) => {
              const total = m.varavu + m.selavu;
              const max = Math.max(1, ...data.byMethod.map((x) => x.varavu + x.selavu));
              const pct = Math.round((total / max) * 100);
              return (
                <div key={m.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="inline-flex items-center gap-2 font-bold"><PaymentLabel method={m.method} /></span>
                    <span className="font-extrabold tabular-nums text-ink">{formatINR(total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * idx }}
                      className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-400 dark:from-saffron-400 dark:to-saffron-500"
                    />
                  </div>
                  <p className="text-[10.5px] font-medium text-faint">
                    {translate("Varavu", "வரவு")} {formatINR(m.varavu)} · {translate("Selavu", "செலவு")} {formatINR(m.selavu)}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Expense Categories Breakdown */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.45 }}
          className="card-surface rounded-2xl p-4 sm:p-5"
        >
          <Header title={translate("Expense Categories · செலவு வகைகள்", "செலவு வகைகள் · Expense Categories")} />
          <div className="mt-4 space-y-3">
            {data.byCategory.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">
                {translate("No expenses recorded for this period.", "இக்காலத்தில் செலவுகள் எதுவும் இல்லை.")}
              </p>
            ) : (
              data.byCategory.map((c, idx) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-bold">{c.category}</span>
                    <span className="font-extrabold tabular-nums text-ink">
                      {formatINR(c.amount)}{" "}
                      <span className="ml-1 text-[10px] font-semibold text-faint">
                        {c.pct}% · {c.count}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(3, c.pct)}%` }}
                      transition={{ duration: 0.8, delay: 0.08 * idx }}
                      className={cn(
                        "h-full rounded-full",
                        c.pct >= 30 ? "bg-red-500" : c.pct >= 15 ? "bg-saffron-500" : "bg-navy-400",
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>

        {/* Top Contributors Leaderboard */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.5 }}
          className="card-surface overflow-hidden rounded-2xl"
        >
          <Header
            title={translate("Top Contributors · முக்கிய நன்கொடையாளர்கள்", "முக்கிய நன்கொடையாளர்கள் · Top Contributors")}
            badge={`${data.totals.collectionCount} ${translate("receipts", "ரசீதுகள்")}`}
          />
          <div className="divide-y divide-line">
            {data.topDonors.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">
                {translate("No contributions recorded yet.", "நன்கொடைகள் எதுவும் இன்னும் பதிவாகவில்லை.")}
              </p>
            ) : (
              data.topDonors.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3 px-4 py-3 sm:px-5 transition-colors hover:bg-surface-2/60">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black tabular-nums",
                      i === 0
                        ? "bg-gold-100 text-gold-700 shadow-sm dark:bg-gold-500/20 dark:text-gold-300"
                        : i === 1
                          ? "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
                          : i === 2
                            ? "bg-saffron-100 text-saffron-700 dark:bg-saffron-500/20 dark:text-saffron-400"
                            : "bg-surface-2 text-faint",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold sm:text-[13.5px]">{d.name}</p>
                    <p className="text-[10.5px] font-medium text-faint">
                      {d.count} {translate("contributions", "முறை")}
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-[13.5px] font-extrabold tabular-nums text-saffron-600 dark:text-saffron-400">
                    {formatINR(d.total)}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </div>

      <p className="text-center text-[11.5px] font-medium text-faint">
        {translate(
          "Balance = Collection − Expenses, computed live · All amounts in Indian Rupees (₹)",
          "கையிருப்பு = வரவு − செலவு, நேரடி கணக்கீடு · அனைத்து தொகைகளும் இந்திய ரூபாயில் (₹)",
        )}
      </p>
    </div>
  );
}

function Header({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-3.5">
      <p className="text-[13.5px] font-extrabold sm:text-[14px]">{title}</p>
      {badge ? <Badge tone="muted">{badge}</Badge> : null}
    </div>
  );
}

/* ── Print / PDF copy ─────────────────────────────────────────── */

function PrintReport({ data }: { data: ReportsData }) {
  const t = data.totals;
  const cell = "border border-[#d7dce6] px-2.5 py-1.5 text-left align-top";
  const th = cn(cell, "bg-[#101f42] font-bold text-white");
  return (
    <div className="print-sheet" aria-hidden>
      <div className="w-[190mm] bg-white px-2 py-3 font-sans text-[#141d33]">
        <div className="mb-4 border-b-2 border-[#101f42] pb-2 text-center">
          <p className="text-[18px] font-black tracking-wide">NETHAJI BOYS MANDRAM</p>
          <p className="text-[13px] font-semibold">நேதாஜி பாய்ஸ் மன்றம் — Financial Report · நிதி அறிக்கை</p>
          <p className="text-[10px] text-[#5f6c88]">{data.year === "all" ? "All time" : `Year ${data.year}`} · Balance = Collection − Expenses</p>
        </div>

        <table className="w-full border-collapse text-[10.5px]">
          <tbody>
            <tr><td className={th} colSpan={2}>Financial summary · நிதி சுருக்கம்</td></tr>
            <tr><td className={cell}>Total Collection · மொத்த வரவு</td><td className={cell}>{formatNumber(t.varavu)}</td></tr>
            <tr><td className={cell}>Total Expenses · மொத்த செலவு</td><td className={cell}>{formatNumber(t.selavu)}</td></tr>
            <tr><td className={cell}>Balance · கையிருப்பு</td><td className={cell}>{formatNumber(t.balance)}</td></tr>
            <tr><td className={cell}>Members · Receipts · Expense entries</td><td className={cell}>{t.members} · {t.collectionCount} · {t.expenseCount}</td></tr>
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse text-[10.5px]">
          <tbody>
            <tr><td className={th} colSpan={3}>Event wise · நிகழ்வு வாரியாக</td></tr>
            <tr><td className={th}>Event</td><td className={th}>வரவு Collection</td><td className={th}>செலவு Expenses</td></tr>
            {data.byEvent.map((e) => (
              <tr key={e.id}><td className={cell}>{e.name}</td><td className={cell}>{formatNumber(e.varavu)}</td><td className={cell}>{formatNumber(e.selavu)}</td></tr>
            ))}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse text-[10.5px]">
          <tbody>
            <tr><td className={th} colSpan={2}>Payment method · பண முறைகள்</td></tr>
            <tr><td className={th}>Method</td><td className={th}>Total</td></tr>
            {data.byMethod.map((m) => <tr key={m.method}><td className={cell}>{m.label}</td><td className={cell}>{formatNumber(m.varavu + m.selavu)}</td></tr>)}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse text-[10.5px]">
          <tbody>
            <tr><td className={th} colSpan={3}>Expense categories · செலவு வகைகள்</td></tr>
            <tr><td className={th}>Category</td><td className={th}>Amount</td><td className={th}>Count</td></tr>
            {data.byCategory.map((c) => <tr key={c.category}><td className={cell}>{c.category}</td><td className={cell}>{formatNumber(c.amount)}</td><td className={cell}>{c.count}</td></tr>)}
          </tbody>
        </table>

        <table className="mt-3 w-full border-collapse text-[10.5px]">
          <tbody>
            <tr><td className={th} colSpan={3}>Top contributors · முக்கிய நன்கொடையாளர்கள்</td></tr>
            {data.topDonors.map((d, i) => (
              <tr key={d.name}><td className={cell}>{i + 1}</td><td className={cell}>{d.name}</td><td className={cell}>{formatNumber(d.total)}</td></tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-center text-[9px] text-[#5f6c88]">
          Nethaji Boys Mandram · Unity · Community · Transparency · Celebration — generated {new Date().toLocaleString("en-GB")}
        </p>
      </div>
    </div>
  );
}
