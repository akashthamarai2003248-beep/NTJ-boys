"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { BarChart3, FileSpreadsheet, FileText } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";

export function ReportsView() {
  const [year, setYear] = useState<string>("all");
  const { data, loading } = useFetch<ReportsData>(`/api/reports?year=${year}`);
  const [printing, setPrinting] = useState(false);

  const currentYear = String(new Date().getFullYear());

  const exportCSV = () => {
    if (!data) return;
    const rows: (string | number)[][] = [];
    const sec = (t: string) => rows.push([t]);

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
        eyebrow="Reports · அறிக்கைகள்"
        title="Reports"
        ta="அறிக்கைகள் · transparent by design"
        subtitle="Computed live from the ledger — varavu minus selavu is always the balance"
        actions={
          data ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={exportCSV}>
                <FileSpreadsheet className="size-4" /> Excel (.csv)
              </Button>
              <Button size="sm" variant="primary" onClick={printPDF}>
                <FileText className="size-4" /> Export PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* period */}
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-muted">
          <BarChart3 className="size-4 text-saffron-600 dark:text-saffron-400" /> Report period · காலம்
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(["all", currentYear] as const).map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12.5px] font-bold transition-colors",
                year === y ? "bg-navy-800 text-white dark:bg-navy-600" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {y === "all" ? "All time · அனைத்தும்" : `${y} · இந்த ஆண்டு`}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : !data ? (
        <div className="card-surface rounded-2xl"><EmptyState icon={BarChart3} title="Could not build the report" message="Try again in a moment." /></div>
      ) : (
        <ReportBody data={data} />
      )}

      {/* hidden printable copy */}
      {printing && typeof document !== "undefined"
        ? createPortal(<PrintReport data={data!} />, document.body)
        : null}
    </div>
  );
}

function ReportBody({ data }: { data: ReportsData }) {
  const t = data.totals;
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* summary */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <SummaryCard label="மொத்த வரவு" sub="Total Collection" value={t.varavu} className="from-saffron-500 to-saffron-600" icon="↑" />
        <SummaryCard label="மொத்த செலவு" sub="Total Expenses" value={t.selavu} className="from-red-500 to-red-600" icon="↓" />
        <SummaryCard label="கையிருப்பு" sub="Balance" value={t.balance} className={t.balance >= 0 ? "from-leaf-500 to-leaf-700" : "from-red-500 to-red-700"} icon="=" />
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <MiniStat label="Members · உறுப்பினர்கள்" value={String(t.members)} />
        <MiniStat label="Receipts · ரசீதுகள்" value={String(t.collectionCount)} />
        <MiniStat label="Expense entries · செலவுகள்" value={String(t.expenseCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* event-wise */}
        <section className="card-surface overflow-hidden rounded-2xl">
          <Header title="Event-wise · நிகழ்வு வாரியாக" />
          <div className="divide-y divide-line">
            {data.byEvent.map((e) => {
              const isGeneral = e.id === "__general";
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xl">{isGeneral ? "🎯" : eventTypeMeta(e.type).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{e.name}</p>
                    <p className="text-[11px] font-medium text-faint">{isGeneral ? "Not tied to an event" : (e.tamilName || "")}</p>
                  </div>
                  <div className="text-right text-[12px] leading-tight">
                    <p className="font-semibold tabular-nums text-leaf-700 dark:text-leaf-400">{formatINR(e.varavu)}</p>
                    <p className="tabular-nums text-red-600 dark:text-red-400">− {formatINR(e.selavu)}</p>
                  </div>
                  <p className={cn("w-24 text-right text-[13.5px] font-extrabold tabular-nums", e.balance >= 0 ? "" : "text-red-600 dark:text-red-400")}>
                    {formatINR(e.balance)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* payment methods */}
        <section className="card-surface rounded-2xl p-5">
          <Header title="Payment method · பண முறைகள்" />
          <div className="mt-4 space-y-3.5">
            {data.byMethod.map((m) => {
              const max = Math.max(1, ...data.byMethod.map((x) => x.varavu + x.selavu));
              const total = m.varavu + m.selavu;
              return (
                <div key={m.method}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="inline-flex items-center gap-2 font-bold"><PaymentLabel method={m.method} /></span>
                    <span className="tabular-nums font-extrabold">{formatINR(total)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-navy-500 to-navy-700 dark:from-saffron-400 dark:to-saffron-600" style={{ width: `${Math.round((total / max) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[10.5px] text-faint">வரவு {formatINR(m.varavu)} · செலவு {formatINR(m.selavu)}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* expense categories */}
        <section className="card-surface rounded-2xl p-5">
          <Header title="Expense categories · செலவு வகைகள்" />
          <div className="mt-4 space-y-3">
            {data.byCategory.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">No expenses recorded for this period.</p>
            ) : (
              data.byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-bold">{c.category}</span>
                    <span className="tabular-nums font-extrabold">{formatINR(c.amount)} <span className="ml-1 text-[10px] font-semibold text-faint">{c.pct}% · {c.count}</span></span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn("h-full rounded-full", c.pct >= 25 ? "bg-red-500" : c.pct >= 10 ? "bg-saffron-500" : "bg-amber-400")}
                      style={{ width: `${Math.max(2, c.pct)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* top donors */}
        <section className="card-surface overflow-hidden rounded-2xl">
          <Header title="Top contributors · முக்கிய நன்கொடையாளர்கள்" badge={`${data.totals.collectionCount} receipts`} />
          <div className="divide-y divide-line">
            {data.topDonors.map((d, i) => (
              <div key={d.name} className="flex items-center gap-3 px-5 py-2.5">
                <span className={cn("w-6 text-center text-[14px] font-black tabular-nums", i === 0 ? "text-gold-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-saffron-600" : "text-faint")}>{i + 1}</span>
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{d.name}</p>
                <p className="text-[11px] text-faint">{d.count}×</p>
                <p className="w-24 text-right text-[13.5px] font-extrabold tabular-nums">{formatINR(d.total)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="text-center text-[11.5px] font-medium text-faint">
        Balance = Collection − Expenses, computed live · All amounts in Indian Rupees (₹)
      </p>
    </div>
  );
}

function Header({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
      <p className="text-[14px] font-extrabold">{title}</p>
      {badge ? <Badge tone="muted">{badge}</Badge> : null}
    </div>
  );
}

function SummaryCard({ label, sub, value, className, icon }: { label: string; sub: string; value: number; className: string; icon: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br px-4 py-4 text-white shadow-card sm:px-5", className)}>
      <span className="absolute -right-1 top-2 text-[52px] font-black leading-none opacity-15">{icon}</span>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/85">{label}</p>
      <p className="text-[22px] font-black leading-none tracking-tight tabular-nums sm:text-[27px]">{formatINR(value)}</p>
      <p className="mt-1.5 text-[10.5px] font-semibold text-white/70">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 sm:rounded-2xl sm:px-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-[16px] font-black tabular-nums">{value}</p>
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
