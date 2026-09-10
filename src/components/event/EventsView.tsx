"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Plus } from "lucide-react";
import type { Event, EventInput, EventStatus, EventWithStats } from "@/lib/data/types";
import { EVENT_STATUSES } from "@/lib/data/types";
import { api } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { EventCard, EventCardSkeleton } from "./EventCard";
import { EventForm } from "./EventForm";

interface EventsPayload { events: EventWithStats[] }

type Filter = "all" | EventStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "registration", label: "Registration" },
  { value: "upcoming", label: "Coming soon" },
  { value: "completed", label: "Completed" },
];

export function EventsView() {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = usePermissions();
  const admin = can.events;

  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(() => params.get("new") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading } = useFetch<EventsPayload>("/api/events");
  const events = useMemo(() => data?.events ?? [], [data]);

  useEffect(() => {
    if (params.get("new") === "1") router.replace("/events", { scroll: false });
  }, [params, router]);

  const filtered = filter === "all" ? events : events.filter((e) => e.status === filter);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length };
    for (const s of EVENT_STATUSES) c[s.value] = events.filter((e) => e.status === s.value).length;
    return c;
  }, [events]);

  const handleCreate = async (input: EventInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<{ event: Event }>("/api/events", input);
      toast.success(`“${res.event.name}” created`);
      setFormOpen(false);
      router.push(`/events/${res.event.id}`);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Celebrations"
        title="Events"
        ta="நிகழ்வுகள்"
        subtitle="Festivals, sports, meetings and community moments — past, present and next"
        actions={
          admin ? (
            <Button variant="primary" onClick={() => { setFormError(null); setFormOpen(true); }}>
              <Plus className="size-4" /> Create Event
            </Button>
          ) : undefined
        }
      />

      <div className="hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all",
                active
                  ? "bg-navy-900 text-white shadow-card dark:bg-navy-600"
                  : "border border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums", active ? "bg-white/20" : "bg-surface-2 text-faint")}>
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
        <div className="card-surface rounded-2xl">
          <EmptyState
            icon={CalendarDays}
            title={filter === "all" ? "No events yet" : `No ${FILTERS.find((f) => f.value === filter)?.label.toLowerCase()} events`}
            message="Every Mandram celebration starts here — create an event and start collecting for it."
            action={admin ? (
              <Button variant="primary" onClick={() => { setFormError(null); setFormOpen(true); }}>
                <CalendarPlus className="size-4" /> Create Event
              </Button>
            ) : undefined}
          />
        </div>
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
