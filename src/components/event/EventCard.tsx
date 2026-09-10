"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { EventWithStats } from "@/lib/data/types";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";
import { friendlyDay } from "@/lib/utils/date";
import { EventStatusPill } from "@/components/shared/meta";
import { EventCover } from "./EventCover";
import { Skeleton } from "@/components/ui/Skeleton";

export function EventCard({ event, index = 0 }: { event: EventWithStats; index?: number }) {
  const running = event.balance >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.07, 0.35) }}
    >
      <Link
        href={`/events/${event.id}`}
        className="group block h-full overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500/60"
      >
        <div className="relative h-32 sm:h-36">
          <EventCover event={event} className="h-full w-full" emojiClass="text-5xl" />
          <div className="absolute left-3 top-3">
            <EventStatusPill status={event.status} />
          </div>
        </div>
        <div className="p-4">
          <h3 className="truncate text-[15.5px] font-extrabold tracking-tight group-hover:text-navy-800 dark:group-hover:text-navy-200">
            {event.name}
          </h3>
          {event.tamilName ? <p className="mt-0.5 text-[12.5px] font-semibold text-faint">{event.tamilName}</p> : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] font-medium text-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5 text-faint" />
              {friendlyDay(event.startDate)}
            </span>
            {event.location ? (
              <span className="inline-flex max-w-36 items-center gap-1 truncate">
                <MapPin className="size-3.5 shrink-0 text-faint" />
                <span className="truncate">{event.location}</span>
              </span>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-surface-2 p-2 text-center">
            <MiniStat label="Collection" ta="வரவு" value={formatINR(event.varavu)} />
            <MiniStat label="Expense" ta="செலவு" value={formatINR(event.selavu)} />
            <MiniStat
              label="Balance"
              ta="இருப்பு"
              value={formatINR(event.balance)}
              valueClass={running ? "text-leaf-600 dark:text-leaf-400" : "text-red-600 dark:text-red-400"}
            />
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-saffron-600 dark:text-saffron-400">
            View Event
            <ArrowUpRight
              className={cn("size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5")}
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function MiniStat({
  label,
  ta,
  value,
  valueClass,
}: {
  label: string;
  ta: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className={cn("truncate text-[13px] font-extrabold tabular-nums", valueClass ?? "text-ink")}>{value}</p>
      <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-faint">
        {label} <span className="normal-case">{ta}</span>
      </p>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <Skeleton className="h-32 rounded-none sm:h-36" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
