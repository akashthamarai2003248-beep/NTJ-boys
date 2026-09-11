"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import type { ActivityLog, EventWithStats, MemberPosition } from "@/lib/data/types";
import type { SeriesBucket } from "@/lib/data/repository";
import type { DashboardPayload } from "@/lib/data/dashboard";
import { useFetch, prefetchRoute } from "@/lib/client/hooks";
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { en: "Good morning", ta: "காலை வணக்கம்" };
  if (h < 17) return { en: "Good afternoon", ta: "மதிய வணக்கம்" };
  return { en: "Good evening", ta: "மாலை வணக்கம்" };
}

export function DashboardView({ initialData }: { initialData?: DashboardPayload }) {
  const { user } = useSession();
  const { can } = usePermissions();
  const { t } = useLang();
  const [period, setPeriod] = useState<PeriodKey>("year");
  const { data, loading } = useFetch<DashboardPayload>(
    "/api/dashboard",
    [],
    initialData,
  );

  const activeSeries = useMemo(() => {
    if (data?.allSeries && data.allSeries[period]) {
      return data.allSeries[period];
    }
    return data?.series ?? [];
  }, [data, period]);

  const stats = useMemo(
    () =>
      makeStats({
        varavu: data?.totals.varavu ?? 0,
        selavu: data?.totals.selavu ?? 0,
        balance: data?.totals.balance ?? 0,
        members: data?.totals.members ?? 0,
        paidMembers: data?.totals.paidMembers ?? (data?.totals.varavu ? 1 : 0),
        paidCount: data?.totals.paidCount ?? (data?.totals.varavu ? 1 : 0),
      }),
    [data],
  );

  const g = greeting();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const greetingText = firstName
    ? t(`${g.en}, ${firstName} 👋`, `${g.ta}, ${firstName} 👋`)
    : t(`${g.en} 👋`, `${g.ta} 👋`);

  return (
    <div className="w-full min-w-0 max-w-full space-y-5 sm:space-y-6">
      {/* Greeting hero */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl px-4 py-5 text-white shadow-card sm:px-6 sm:py-6"
      >
        {/* Tricolor Netaji banner background - vibrant and fully visible */}
        <img
          src="/netaji-banner.png"
          alt="Nethaji Boys Mandram"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Subtle vignette: keeps the banner artwork, Netaji portrait, and colors bright and visible */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-950/50 via-navy-950/15 to-transparent sm:from-navy-950/60 sm:via-navy-950/15" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-navy-950/50 to-transparent" aria-hidden />

        <div className="relative flex flex-col gap-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-saffron-300 sm:text-[11.5px]">
              {t(g.en, g.ta)}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-[20px] font-extrabold leading-tight tracking-tight sm:text-[24px]">
              {greetingText}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12px] font-medium text-white/95 sm:text-[12.5px]">
              <Sparkles className="size-3.5 shrink-0 text-saffron-300" />
              <span>{t("Nethaji Boys Mandram", "நேதாஜி பாய்ஸ் மன்றம்")}</span>
              <span className="text-white/60">·</span>
              <span>{today}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pt-0">
            {can.finances ? (
              <Link
                href="/collections?add=1"
                prefetch={true}
                onMouseEnter={() => prefetchRoute("/collections")}
                onTouchStart={() => prefetchRoute("/collections")}
                onPointerDown={() => prefetchRoute("/collections")}
              >
                <Button
                  size="md"
                  className="bg-white text-navy-900 shadow-none hover:bg-saffron-50 hover:text-saffron-800"
                >
                  <Plus className="size-4" />
                  {t("Add Collection", "வரவு சேர்க்க")}
                </Button>
              </Link>
            ) : null}
            <Link
              href="/events"
              prefetch={true}
              onMouseEnter={() => prefetchRoute("/events")}
              onTouchStart={() => prefetchRoute("/events")}
              onPointerDown={() => prefetchRoute("/events")}
            >
              <Button
                size="md"
                variant="secondary"
                className="border-white/35 bg-black/40 font-bold text-white shadow-md backdrop-blur-md hover:border-white/55 hover:bg-black/55 hover:text-white"
              >
                {t("Events", "நிகழ்வுகள்")} <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Stat cards */}
      {loading && !data ? (
        <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">
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
      <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <div className="w-full min-w-0 max-w-full lg:col-span-3">
          <OverviewChart period={period} onPeriodChange={setPeriod} data={activeSeries} loading={loading && (!data || !activeSeries.length)} />
        </div>
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="card-surface w-full min-w-0 max-w-full rounded-2xl p-4 sm:p-5 lg:col-span-2"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-extrabold tracking-tight">{t("Recent Activity", "சமீபத்திய செயல்பாடு")}</h2>
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
          <Link
            href="/events"
            prefetch={true}
            onMouseEnter={() => prefetchRoute("/events")}
            onTouchStart={() => prefetchRoute("/events")}
            onPointerDown={() => prefetchRoute("/events")}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-saffron-600 hover:underline dark:text-saffron-400"
          >
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
