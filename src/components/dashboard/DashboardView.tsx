"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import type { ActivityLog, EventWithStats, MemberPosition } from "@/lib/data/types";
import type { SeriesBucket } from "@/lib/data/repository";
import { useFetch } from "@/lib/client/hooks";
import { qs } from "@/lib/client/api";
import { useSession, usePermissions } from "@/components/layout/session";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { StatCards, makeStats } from "./StatCards";
import { OverviewChart, type PeriodKey } from "./OverviewChart";
import { ActivityFeed } from "./ActivityFeed";
import { EventCard, EventCardSkeleton } from "@/components/event/EventCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { LogoMark } from "@/components/ui/Logo";

interface DashboardPayload {
  totals: { varavu: number; selavu: number; balance: number; members: number };
  series: SeriesBucket[];
  events: (EventWithStats & { role?: MemberPosition })[];
  activity: ActivityLog[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { en: "Good morning", ta: "காலை வணக்கம்" };
  if (h < 17) return { en: "Good afternoon", ta: "மதிய வணக்கம்" };
  return { en: "Good evening", ta: "மாலை வணக்கம்" };
}

export function DashboardView() {
  const { user } = useSession();
  const { can } = usePermissions();
  const { t } = useLang();
  const [period, setPeriod] = useState<PeriodKey>("year");
  const { data, loading } = useFetch<DashboardPayload>(`/api/dashboard${qs({ period })}`, [period]);

  const stats = useMemo(
    () =>
      makeStats({
        varavu: data?.totals.varavu ?? 0,
        selavu: data?.totals.selavu ?? 0,
        balance: data?.totals.balance ?? 0,
        members: data?.totals.members ?? 0,
      }),
    [data],
  );

  const g = greeting();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Greeting hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl px-5 py-5 text-white shadow-card sm:px-6 sm:py-6"
      >
        {/* Tricolor Netaji banner background */}
        <img
          src="/netaji-banner.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Dark navy fade (left) so the text stays readable; warm art shows through on the right */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-900/40 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-navy-950/60 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute -right-8 -top-12 opacity-[0.10]" aria-hidden>
          <LogoMark className="size-40" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.22em] text-saffron-300">
              {t(g.en, g.ta)}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-[20px] font-extrabold leading-tight tracking-tight sm:text-[24px]">
              {t(`${g.en}, ${user?.name.split(" ")[0]} 👋`, `${g.ta}, ${user?.name.split(" ")[0]} 👋`)}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12.5px] font-medium text-navy-100/90">
              <Sparkles className="size-3.5 text-saffron-300" />
              {t("Nethaji Boys Mandram", "நேதாஜி பாய்ஸ் மன்றம்")}
              <span className="text-navy-100/50">·</span>
              {today}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {can.finances ? (
              <Link href="/collections?add=1">
                <Button
                  size="md"
                  className="bg-white text-navy-900 shadow-none hover:bg-saffron-50 hover:text-saffron-800"
                >
                  <Plus className="size-4" />
                  {t("Add Collection", "வரவு சேர்க்க")}
                </Button>
              </Link>
            ) : null}
            <Link href="/events">
              <Button
                size="md"
                variant="secondary"
                className="border-white/25 bg-white/10 text-white backdrop-blur hover:border-white/40 hover:bg-white/15 hover:text-white dark:border-white/20"
              >
                {t("Events", "நிகழ்வுகள்")} <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Stat cards */}
      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-surface rounded-2xl p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 rounded-xl sm:size-11" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StatCards data={stats} />
      )}

      {/* Chart + activity */}
      <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
        <div className="lg:col-span-3">
          <OverviewChart period={period} onPeriodChange={setPeriod} data={data?.series ?? []} loading={loading} />
        </div>
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="card-surface rounded-2xl p-4 sm:p-5 lg:col-span-2"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold tracking-tight">{t("Recent Activity", "சமீபத்திய செயல்பாடு")}</h2>
              <p className="truncate text-[12px] font-medium text-muted">{t("Transparency log", "வெளிப்படைத்தன்மை பதிவு")}</p>
            </div>
            <Link href="/settings" className="shrink-0 text-[12px] font-bold text-saffron-600 hover:underline dark:text-saffron-400">
              {t("Audit log", "பதிவு")}
            </Link>
          </div>
          {loading && !data ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ActivityFeed logs={data?.activity ?? []} limit={6} />
          )}
        </motion.section>
      </div>

      {/* Upcoming events */}
      <section>
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold tracking-tight">{t("Upcoming Events", "வரவிருக்கும் நிகழ்வுகள்")}</h2>
            <p className="truncate text-[12px] font-medium text-muted">{t("what the Mandram is celebrating next", "மன்றத்தின் அடுத்த கொண்டாட்டங்கள்")}</p>
          </div>
          <Link href="/events" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-saffron-600 hover:underline dark:text-saffron-400">
            {t("View all", "அனைத்தும்")} <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {loading && !data
            ? [0, 1, 2].map((i) => <EventCardSkeleton key={i} />)
            : data?.events.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
        </div>
      </section>
    </div>
  );
}
