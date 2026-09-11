"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Calendar, CalendarDays, CalendarPlus, Plus } from "lucide-react";
import type { Event, EventInput, EventStatus, EventWithStats } from "@/lib/data/types";
import { EVENT_STATUSES } from "@/lib/data/types";
import { api } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { resolveEventStatus } from "@/lib/utils/date";
import { EventCard, EventCardSkeleton } from "./EventCard";
import { EventForm } from "./EventForm";

interface EventsPayload { events: EventWithStats[] }

type Filter = "all" | "active" | "upcoming" | "completed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

export function EventsView() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = usePermissions();
  const { t, lang } = useLang();
  const admin = can.events;

  const [year, setYear] = useState<string>(() => params.get("year") ?? "all");
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(() => params.get("new") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading } = useFetch<EventsPayload>("/api/events");
  const events = useMemo(() => {
    return (data?.events ?? []).map((e) => ({
      ...e,
      status: resolveEventStatus(e.status, e.startDate, e.endDate),
    }));
  }, [data]);

  useEffect(() => {
    if (params.get("new") === "1") router.replace("/events", { scroll: false });
  }, [params, router]);

  // Extract distinct available years from all events
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      const y1 = e.startDate?.slice(0, 4);
      const y2 = e.endDate?.slice(0, 4);
      const y3 = e.createdAt?.slice(0, 4);
      if (y1 && /^\d{4}$/.test(y1)) set.add(y1);
      if (y2 && /^\d{4}$/.test(y2)) set.add(y2);
      if (y3 && /^\d{4}$/.test(y3)) set.add(y3);
    }
    set.add(new Date().getFullYear().toString());
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [events]);

  // Filter by year first
  const eventsInYear = useMemo(() => {
    if (year === "all") return events;
    return events.filter((e) => {
      const y1 = e.startDate?.slice(0, 4);
      const y2 = e.endDate?.slice(0, 4);
      const y3 = e.createdAt?.slice(0, 4);
      return y1 === year || y2 === year || (!y1 && y3 === year);
    });
  }, [events, year]);

  // Status counts computed dynamically for the selected year
  const counts = useMemo(() => {
    return {
      all: eventsInYear.length,
      active: eventsInYear.filter((e) => e.status === "active").length,
      upcoming: eventsInYear.filter((e) => e.status === "upcoming" || e.status === "registration").length,
      completed: eventsInYear.filter((e) => e.status === "completed").length,
    };
  }, [eventsInYear]);

  // Final filtered list respecting both year and status
  const filtered = useMemo(() => {
    if (filter === "all") return eventsInYear;
    if (filter === "upcoming") return eventsInYear.filter((e) => e.status === "upcoming" || e.status === "registration");
    return eventsInYear.filter((e) => e.status === filter);
  }, [eventsInYear, filter]);

  const handleCreate = async (input: EventInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<{ event: Event }>("/api/events", input);
      toast.success(t(`“${res.event.name}” created`, `“${res.event.tamilName || res.event.name}” உருவாக்கப்பட்டது`));
      setFormOpen(false);
      router.push(`/events/${res.event.id}`);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const filterName = (val: Filter) => {
    if (val === "all") return t("All", "அனைத்தும்");
    if (val === "active") return t("Active", "நடைபெறுபவை");
    if (val === "upcoming") return t("Upcoming", "வரவிருப்பவை");
    if (val === "completed") return t("Completed", "முடிந்தவை");
    return val;
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header & Year Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Year Filter: 1-Tap Thumb Navigation Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted shrink-0 mr-1">
            <Calendar className="size-3.5 text-saffron-500" />
            <span>{t("Year", "ஆண்டு")}</span>
          </span>
          <button
            type="button"
            onClick={() => setYear("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[12px] font-bold transition-all",
              year === "all"
                ? "bg-saffron-500 text-ink shadow-sm dark:bg-saffron-500 dark:text-ink font-black"
                : "border border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-ink"
            )}
          >
            {t("All Years", "அனைத்தும்")}
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setYear(yr)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[12px] font-bold transition-all",
                year === yr
                  ? "bg-saffron-500 text-ink shadow-sm dark:bg-saffron-500 dark:text-ink font-black"
                  : "border border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-ink"
              )}
            >
              {yr}
            </button>
          ))}
        </div>

        {admin && (
          <div className="flex items-center justify-end shrink-0">
            <Button variant="primary" size="sm" onClick={() => { setFormError(null); setFormOpen(true); }}>
              <Plus className="size-4" /> {t("Create Event", "நிகழ்வை உருவாக்கு")}
            </Button>
          </div>
        )}
      </div>

      {/* 4-Column responsive tabs bar: clean on mobile without horizontal scrolling */}
      <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[12px] font-bold transition-all sm:px-3.5 sm:py-1.5",
                active
                  ? "bg-navy-900 text-white shadow-sm dark:bg-saffron-500 dark:text-ink"
                  : "border border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              <span>{filterName(f.value)}</span>
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums", active ? "bg-white/20 dark:bg-navy-950/20" : "bg-surface text-faint")}>
                {counts[f.value] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {[0, 1, 2].map((i) => <EventCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        events.length > 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-line/60 bg-surface/50 p-8 text-center sm:p-12">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-faint">
              <CalendarDays className="size-6" />
            </div>
            <h3 className="mt-3 text-[14.5px] font-bold text-ink">
              {year !== "all"
                ? `No ${filter === "all" ? "" : filter} events in ${year}`
                : `No ${filter} events`}
            </h3>
            <p className="mt-1 text-[12px] text-faint max-w-sm">
              {filter === "completed"
                ? "Completed festivals and celebrations will appear here once wrapped up."
                : filter === "active"
                ? "No events are currently ongoing. Check Upcoming to view scheduled celebrations."
                : year !== "all"
                ? `No events recorded for ${year}. Try switching to all years.`
                : "No upcoming celebrations scheduled right now."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {year !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setYear("all")}
                >
                  {t("Show All Years", "அனைத்து ஆண்டுகளையும் காட்டு")}
                </Button>
              )}
              {filter !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  {t(`View All (${eventsInYear.length})`, `அனைத்தும் (${eventsInYear.length})`)}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="card-surface rounded-2xl">
            <EmptyState
              icon={CalendarDays}
              title="No events yet"
              message="Every Mandram celebration starts here — create an event and start collecting for it."
              action={admin ? (
                <Button variant="primary" onClick={() => { setFormError(null); setFormOpen(true); }}>
                  <CalendarPlus className="size-4" /> Create Event
                </Button>
              ) : undefined}
            />
          </div>
        )
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {filtered.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
        </div>
      )}

      {events.length > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-x-2 text-[11.5px] font-medium text-faint">
          <Badge tone="gold" className="px-1.5 py-0">Tip</Badge>
          Event-wise collections & expenses live inside each event page.
        </p>
      )}

      <Modal
        open={formOpen}
        onClose={() => { if (!submitting) setFormOpen(false); }}
        title="Create Event"
        description="நிகழ்வு உருவாக்கு · festivals, sports, meetings — anything the Mandram hosts"
        maxWidth="max-w-xl"
      >
        <EventForm submitting={submitting} error={formError} onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
