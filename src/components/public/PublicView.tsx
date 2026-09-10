"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EyeOff, HeartHandshake, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import type { PublicOverview } from "@/lib/data/repository";
import { useFetch } from "@/lib/client/hooks";
import { LogoMark } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatINR } from "@/lib/utils/money";
import { formatLong } from "@/lib/utils/date";

export function PublicView() {
  const { data, loading, error } = useFetch<PublicOverview>("/api/public/overview");

  return (
    <div className="min-h-dvh bg-bg">
      {/* top band */}
      <header className="brand-gradient brand-aurora relative overflow-hidden text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div className="leading-tight">
              <p className="text-[15px] font-black tracking-[0.02em]">NETHAJI BOYS MANDRAM</p>
              <p className="text-[12.5px] font-semibold text-saffron-200">நேதாஜி பாய்ஸ் மன்றம்</p>
            </div>
          </div>
          <Link href="/login" className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[12px] font-bold backdrop-blur transition-colors hover:bg-white/20">
            Admin sign in
          </Link>
        </div>
        <div className="mx-auto max-w-4xl px-4 pb-10 pt-8 text-center sm:px-6 sm:pt-12">
          <Badge tone="gold" className="bg-gold-400/90 text-[#101f42] dark:bg-gold-400/90">வெளிப்படைத்தன்மை · Public transparency</Badge>
          <h1 className="mx-auto mt-4 max-w-xl text-[26px] font-black leading-tight tracking-tight sm:text-[34px]">
            Every rupee of the Mandram, <span className="text-saffron-400">open to every member</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[13.5px] font-medium leading-relaxed text-white/75">
            {`One community · one account book. Collection, spending and event balances are shared here — personal details stay private.`}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        {loading && !data ? (
          <div className="-mt-6 space-y-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[13px] font-semibold text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            Could not load the public overview.
          </p>
        ) : data && !data.enabled ? (
          <div className="card-surface -mt-6 rounded-2xl p-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300"><EyeOff className="size-7" /></span>
            <h2 className="mt-4 text-[17px] font-extrabold">Public view is currently off</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
              The Mandram has paused public transparency. Members with access can switch it back on in Settings · அமைப்புகள்.
            </p>
          </div>
        ) : data ? (
          <>
            {/* totals */}
            <div className="card-surface relative -mt-6 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl text-center shadow-pop">
              <PublicNumber label="மொத்த வரவு" sub="Total Collection" value={data.totals.varavu} className="text-leaf-600 dark:text-leaf-400" />
              <PublicNumber label="மொத்த செலவு" sub="Total Expenses" value={data.totals.selavu} className="text-red-600 dark:text-red-400" />
              <PublicNumber label="கையிருப்பு" sub="Balance" value={data.totals.balance} className={data.totals.balance >= 0 ? "text-navy-800 dark:text-navy-200" : "text-red-600"} />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-faint"><Users className="size-3.5" /> {data.totals.members} members across {data.events.length} events</p>

            {/* events */}
            <section className="mt-10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-extrabold tracking-tight">Events · நிகழ்வுகள்</h2>
                  <p className="text-[12.5px] text-muted">Money tracked per celebration — ஓர் ஒன்றாக, வெளிப்படையாக</p>
                </div>
                <Badge tone="navy">{data.events.length} events</Badge>
              </div>
              <div className="mt-4 space-y-3.5">
                {data.events.length === 0 ? (
                  <div className="card-surface rounded-2xl p-6 text-center text-[13px] text-muted">No events yet.</div>
                ) : (
                  data.events.map((e) => {
                    const balance = e.varavu - e.selavu;
                    return (
                      <div key={e.id} className="card-surface rounded-2xl p-4.5 sm:p-5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="text-[15px] font-extrabold tracking-tight">{e.name}</h3>
                          <span className="text-[12px] font-semibold text-muted">{e.tamilName || ""}</span>
                          <span className="ml-auto rounded-full bg-surface-2 px-2.5 py-1 text-[10.5px] font-bold capitalize text-faint">{e.status}</span>
                        </div>
                        <p className="mt-1 text-[12px] font-medium text-muted">
                          {formatLong(e.startDate)}{e.endDate && e.endDate !== e.startDate ? ` → ${formatLong(e.endDate)}` : ""} · {e.location || "Location TBA"}
                        </p>
                        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                          <PublicMini label="வரவு" sub="Collected" value={e.varavu} tone="text-leaf-600 dark:text-leaf-400" />
                          <PublicMini label="செலவு" sub="Spent" value={e.selavu} tone="text-red-600 dark:text-red-400" />
                          <PublicMini label="இருப்பு" sub="Balance" value={balance} tone={balance >= 0 ? "text-navy-800 dark:text-navy-200" : "text-red-600"} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        ) : null}

        {/* privacy note */}
        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Private by default", ta: "தனிப்பட்டவை", body: "Phone numbers, member details and personal notes are never shown here." },
            { icon: HeartHandshake, title: "Live from the ledger", ta: "நேரடி கணக்கு", body: "Totals recompute from every collection & expense — no manual numbers." },
            { icon: LockKeyhole, title: "Managed by the Mandram", ta: "பாதுகாப்பானது", body: "Only the admin decides when public view is on, and what appears." },
          ].map((f) => (
            <div key={f.title} className="card-surface rounded-2xl p-4">
              <f.icon className="size-5 text-saffron-600 dark:text-saffron-400" />
              <p className="mt-2.5 text-[13px] font-extrabold">{f.title}</p>
              <p className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-faint">{f.ta}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-12 flex flex-col items-center gap-1.5 text-center">
          <p className="text-[12px] font-bold text-muted">NETHAJI BOYS · MANDRAM — Unity · Community · Transparency · Celebration</p>
          <p className="text-[11px] text-faint">© {new Date().getFullYear()} Nethaji Boys Mandram · நேதாஜி பாய்ஸ் மன்றம்</p>
        </footer>
      </main>
    </div>
  );
}

function PublicNumber({ label, sub, value, className }: { label: string; sub: string; value: number; className: string }) {
  return (
    <div className="px-3 py-6 sm:py-8">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-faint">{label}</p>
      <CountUp value={value} className={className} />
      <p className="mt-1 text-[10px] font-semibold text-faint">{sub}</p>
    </div>
  );
}

function CountUp({ value, className }: { value: number; className: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <p className={`text-[26px] font-black leading-none tracking-tight tabular-nums sm:text-[30px] ${className}`}>{formatINR(display)}</p>;
}

function PublicMini({ label, sub, value, tone }: { label: string; sub: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-faint">{label} · {sub}</p>
      <p className={`mt-0.5 truncate text-[15px] font-extrabold tabular-nums ${tone}`}>{formatINR(value)}</p>
    </div>
  );
}
