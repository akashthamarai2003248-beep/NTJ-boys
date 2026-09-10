"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trophy } from "lucide-react";
import type { Event, Game, GameInput, GameStatus } from "@/lib/data/types";
import { GAME_STATUSES } from "@/lib/data/types";
import type { GameListItem } from "@/lib/data/repository";
import { api, qs } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import { GameCard } from "./GameCard";
import { GameForm } from "./GameForm";

interface GamesPayload { games: GameListItem[] }
interface EventsPayload { events: Event[] }

const STATUS_FILTERS: (GameStatus | "all")[] = ["all", "open", "ongoing", "results", "completed"];

export function GamesView() {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const admin = can.events;
  const [status, setStatus] = useState<GameStatus | "all">("all");
  const [eventId, setEventId] = useState(() => searchParams.get("eventId") ?? "");
  const { data, loading, reload } = useFetch<GamesPayload>(`/api/games${qs({ status: status === "all" ? null : status, eventId })}`);
  const eventsFetch = useFetch<EventsPayload>("/api/events");
  const events = useMemo(() => eventsFetch.data?.events ?? [], [eventsFetch.data]);

  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const games = data?.games ?? [];

  const create = async (input: GameInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.post<{ game: Game }>("/api/games", input);
      toast.success(`“${res.game.name}” created`);
      setCreating(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Sports · விளையாட்டு"
        title="Games"
        ta="விளையாட்டுகள் · tournaments & races"
        subtitle="Teams, participants, matches and results for every Mandram competition"
        actions={admin ? (
          <Button variant="primary" onClick={() => { setFormError(null); setCreating(true); }}>
            <Plus className="size-4" /> Create Game
          </Button>
        ) : undefined}
      />

      {/* filters */}
      <div className="card-surface flex flex-wrap items-center gap-2 rounded-2xl px-3.5 py-2.5">
        <div className="hide-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors",
                status === s ? "bg-navy-800 text-white dark:bg-navy-600" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {s === "all" ? "All" : (GAME_STATUSES.find((x) => x.value === s)?.label ?? s)}
            </button>
          ))}
        </div>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          aria-label="Filter by event"
          className="ml-auto h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px] font-semibold text-muted outline-none focus:border-navy-300"
        >
          <option value="">All events</option>
          <option value="none">General only</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : games.length === 0 ? (
        <div className="card-surface rounded-2xl">
          <EmptyState
            icon={Trophy}
            tone="gold"
            title="No games yet"
            message="Create a cricket cup, tug of war, running race — every Pongal and community competition lives here."
            action={admin ? (
              <Button variant="primary" onClick={() => setCreating(true)}><Plus className="size-4" /> Create Game</Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => { if (!submitting) setCreating(false); }}
        title="Create Game"
        description="New competition · புதிய போட்டி"
        maxWidth="max-w-xl"
      >
        <GameForm events={events} initial={null} submitting={submitting} error={formError} onSubmit={create} onCancel={() => setCreating(false)} />
      </Modal>

      {admin ? null : <div className="rounded-xl border border-line bg-surface-2/60 px-4 py-3 text-[12px] font-medium text-muted"><Badge tone="muted">View only</Badge> Only the admin can create games or record results.</div>}
    </div>
  );
}
