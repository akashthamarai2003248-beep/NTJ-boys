"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, BarChart3, CalendarDays, ChevronRight, HandCoins, MapPin, Pencil, Plus,
  Trash2, TrendingDown, Trophy, Users, Camera,
} from "lucide-react";
import type { Collection, Event, EventInput, EventStats, Expense, GalleryPhoto, GameStatus } from "@/lib/data/types";
import type { GameListItem } from "@/lib/data/repository";
import { GAME_KINDS } from "@/lib/data/types";
import { api, qs } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { EventCover } from "./EventCover";
import { EventForm } from "./EventForm";
import { EventStatusPill, PaymentLabel, eventTypeMeta } from "@/components/shared/meta";
import { formatINR } from "@/lib/utils/money";
import { formatLong, formatShort } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

interface DetailPayload {
  event: Event;
  stats: EventStats;
}
interface ListPayload {
  items: (Collection | Expense)[];
  total: number;
  sum: number;
}

type Tab = "overview" | "varavu" | "selavu" | "games" | "participants" | "photos" | "reports";

const TABS: { id: Tab; label: string; ta: string }[] = [
  { id: "overview", label: "Overview", ta: "கண்ணோட்டம்" },
  { id: "varavu", label: "வரவு", ta: "Collections" },
  { id: "selavu", label: "செலவு", ta: "Expenses" },
  { id: "games", label: "Games", ta: "விளையாட்டுகள்" },
  { id: "participants", label: "Participants", ta: "பங்கேற்பாளர்கள்" },
  { id: "photos", label: "Photos", ta: "புகைப்படங்கள்" },
  { id: "reports", label: "Reports", ta: "அறிக்கை" },
];

export function EventDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const admin = can.events;
  const writable = can.finances;

  const [tab, setTab] = useState<Tab>("overview");
  const { data, loading, error, reload } = useFetch<DetailPayload>(`/api/events/${id}`);
  const colFetch = useFetch<ListPayload>(`/api/collections${qs({ eventId: id, perPage: 200 })}`);
  const expFetch = useFetch<ListPayload>(`/api/expenses${qs({ eventId: id, perPage: 200 })}`);
  const gamesFetch = useFetch<{ games: GameListItem[] }>(`/api/games${qs({ eventId: id })}`);
  const galleryFetch = useFetch<{ photos: GalleryPhoto[] }>(`/api/gallery${qs({ eventId: id })}`);

  const event = data?.event ?? null;
  const stats = data?.stats;

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const save = async (input: EventInput) => {
    if (!event) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.patch(`/api/events/${event.id}`, input);
      toast.success("Event updated");
      setEditing(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const destroy = async () => {
    if (!event) return;
    setDeleteBusy(true);
    try {
      await api.del(`/api/events/${event.id}`);
      toast.success("Event removed");
      router.push("/events");
    } catch (e) {
      toast.error((e as Error).message);
      setDeleteBusy(false);
    }
  };

  const contributors = useMemo(() => {
    const cols = (colFetch.data?.items ?? []) as Collection[];
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const c of cols) {
      const cur = map.get(c.personName) ?? { name: c.personName, total: 0, count: 0 };
      cur.total += c.amount;
      cur.count += 1;
      map.set(c.personName, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
  }, [colFetch.data]);

  const collections = (colFetch.data?.items ?? []) as Collection[];
  const expenses = (expFetch.data?.items ?? []) as Expense[];
  const games = gamesFetch.data?.games ?? [];
  const photos = galleryFetch.data?.photos ?? [];

  if (error) {
    return (
      <div className="card-surface rounded-2xl">
        <EmptyState icon={CalendarDays} title="Event not found" message={error} action={
          <Link href="/events"><Button variant="secondary">Back to Events</Button></Link>
        } />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> All events
      </Link>

      {loading && !event ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : event && stats ? (
        <>
          {/* hero */}
          <div className="relative overflow-hidden rounded-2xl border border-line shadow-card">
            <EventCover event={event} className="h-48 sm:h-56" showEmoji={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/45 to-navy-950/10" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
              <div className="flex items-center gap-2">
                <EventStatusPill status={event.status} />
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                  {eventTypeMeta(event.type).emoji} {eventTypeMeta(event.type).label}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-[22px] font-black leading-tight tracking-tight drop-shadow-sm sm:text-[28px]">
                    {event.name}
                  </h1>
                  <p className="mt-1 text-[14px] font-semibold text-saffron-200">
                    நேதாஜி பாய்ஸ் மன்றம் · {event.tamilName || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {admin && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-white/25 bg-white/15 text-white backdrop-blur hover:bg-white/25 hover:text-white"
                      onClick={() => { setFormError(null); setEditing(true); }}
                    >
                      <Camera className="size-3.5" /> {event.cover ? "Photo" : "Add Photo"}
                    </Button>
                  )}
                  {admin && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
                      onClick={() => { setFormError(null); setEditing(true); }}
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                  )}
                  {writable && (
                    <Link href={`/collections?add=1&eventId=${event.id}`}>
                      <Button size="sm" className="bg-saffron-500 text-white hover:bg-saffron-600">
                        <Plus className="size-3.5" /> Add Collection
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* stat strip */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <EventMoney label="Collection" ta="வரவு" value={formatINR(stats.varavu)} icon={HandCoins} tone="bg-saffron-100 text-saffron-700 dark:bg-saffron-500/15 dark:text-saffron-400" />
            <EventMoney label="Expenses" ta="செலவு" value={formatINR(stats.selavu)} icon={TrendingDown} tone="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" />
            <EventMoney label="Balance" ta="இருப்பு" value={formatINR(stats.balance)} icon={HandCoins} tone={stats.balance >= 0 ? "bg-leaf-100 text-leaf-700 dark:bg-leaf-500/15 dark:text-leaf-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"} balance />
          </div>

          {/* tabs */}
          <div className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative shrink-0 px-3.5 py-2.5 text-[13px] font-bold transition-colors",
                    active ? "text-navy-900 dark:text-white" : "text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                  <span className={cn("ml-1 text-[11px] font-semibold", active ? "text-saffron-600" : "text-faint")}>{t.ta}</span>
                  {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-saffron-500" />}
                </button>
              );
            })}
          </div>

          <TabContent
            tab={tab}
            event={event}
            collections={collections}
            expenses={expenses}
            contributors={contributors}
            stats={stats}
            games={games}
            photos={photos}
            collectionTotal={colFetch.data?.sum ?? 0}
            expenseTotal={expFetch.data?.sum ?? 0}
          />
        </>
      ) : null}

      <Modal
        open={editing}
        onClose={() => { if (!submitting) setEditing(false); }}
        title="Edit Event"
        description={event?.name}
        maxWidth="max-w-xl"
      >
        <EventForm initial={event} submitting={submitting} error={formError} onSubmit={save} onCancel={() => setEditing(false)} />
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={destroy}
        loading={deleteBusy}
        title="Delete this event?"
        body={<>“<b>{event?.name}</b>” will be removed. Its collections and expenses stay in the ledger as General fund records.</>}
        confirmLabel="Delete event"
      />

      {event && (
        <div className="flex justify-end">
          {admin && (
            <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Delete event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EventMoney({
  label, ta, value, icon: Icon, tone, balance,
}: {
  label: string; ta: string; value: string; icon: typeof HandCoins; tone: string; balance?: boolean;
}) {
  return (
    <div className="card-surface rounded-2xl p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-8 items-center justify-center rounded-lg sm:size-9", tone)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-muted sm:text-[12px]">{label} · {ta}</p>
          <p className={cn("mt-0.5 truncate text-[17px] font-black leading-none tabular-nums sm:text-[20px]", balance ? "" : "")}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function TabContent({
  tab, event, collections, expenses, contributors, stats, games, photos, collectionTotal, expenseTotal,
}: {
  tab: Tab;
  event: Event;
  collections: Collection[];
  expenses: Expense[];
  contributors: { name: string; total: number; count: number }[];
  stats: EventStats;
  games: GameListItem[];
  photos: GalleryPhoto[];
  collectionTotal: number;
  expenseTotal: number;
}) {
  const meta = eventTypeMeta(event.type);

  if (tab === "overview") {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-[15px] font-extrabold">About this event</h3>
          {event.description ? <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{event.description}</p> : null}
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            <DetailRow icon={<CalendarDays className="size-4" />} label="Dates · தேதிகள்" value={`${formatLong(event.startDate)} → ${formatLong(event.endDate)}`} />
            <DetailRow icon={<MapPin className="size-4" />} label="Location · இடம்" value={event.location || "—"} />
            <DetailRow icon={<Users className="size-4" />} label="Type · வகை" value={`${meta.label} ${meta.emoji}`} />
            <DetailRow icon={<HandCoins className="size-4" />} label="Event name · பெயர்" value={event.tamilName || event.name} />
          </dl>
        </div>
        <div className="space-y-4">
          <div className="card-surface rounded-2xl p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">Event balance</p>
            <p className={cn("mt-1 text-[26px] font-black tabular-nums", stats.balance >= 0 ? "text-leaf-600 dark:text-leaf-400" : "text-red-600 dark:text-red-400")}>
              {formatINR(stats.balance)}
            </p>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-muted">வரவு · Collections</span><b className="tabular-nums">{formatINR(stats.varavu)}</b></div>
              <div className="flex justify-between"><span className="text-muted">செலவு · Expenses</span><b className="tabular-nums">{formatINR(stats.selavu)}</b></div>
              <div className="flex justify-between border-t border-line pt-2"><span className="text-muted">Donors</span><b>{collections.length}</b></div>
              <div className="flex justify-between"><span className="text-muted">Expense entries</span><b>{expenses.length}</b></div>
            </div>
          </div>
          <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
            <span className="text-2xl">{meta.emoji}</span>
            <p className="text-[12.5px] font-medium text-muted">This celebration runs on the Mandram&apos;s unity — every ₹ recorded here is transparent to members.</p>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "varavu") {
    return (
      <MoneyTab
        title="வரவு · Collections for this event"
        emptyTitle="No collections for this event yet"
        emptyMessage="Start collecting — every donor gets a numbered receipt."
        total={collectionTotal}
        link={`/collections?eventId=${event.id}`}
        linkLabel="Open in வரவு"
        ctaHref={`/collections?add=1&eventId=${event.id}`}
      >
        {collections.length === 0 ? null : (
          <div className="divide-y divide-line">
            {collections.slice(0, 12).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={c.personName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">{c.personName}</p>
                  <p className="text-[11px] text-faint">{c.receiptNumber} · {formatShort(c.date)}</p>
                </div>
                <PaymentLabel method={c.paymentMethod} />
                <p className="w-24 text-right text-[14px] font-extrabold tabular-nums">{formatINR(c.amount)}</p>
              </div>
            ))}
            {collections.length > 12 ? <p className="px-5 py-3 text-center text-[12px] text-faint">+ {collections.length - 12} more donors…</p> : null}
          </div>
        )}
      </MoneyTab>
    );
  }

  if (tab === "selavu") {
    return (
      <MoneyTab
        title="செலவு · Expenses for this event"
        emptyTitle="No expenses for this event yet"
        emptyMessage="Record expenses against this event to keep its balance exact."
        total={expenseTotal}
        link={`/expenses?eventId=${event.id}`}
        linkLabel="Open in செலவு"
        ctaHref="/expenses?add=1"
      >
        {expenses.length === 0 ? null : (
          <div className="divide-y divide-line">
            {expenses.slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400")}>
                  <TrendingDown className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">{e.title}</p>
                  <p className="text-[11px] text-faint">{formatShort(e.date)} · {e.paymentMethod.toUpperCase()}</p>
                </div>
                <p className="w-24 text-right text-[14px] font-extrabold tabular-nums text-red-600 dark:text-red-400">− {formatINR(e.amount)}</p>
              </div>
            ))}
            {expenses.length > 12 ? <p className="px-5 py-3 text-center text-[12px] text-faint">+ {expenses.length - 12} more entries…</p> : null}
          </div>
        )}
      </MoneyTab>
    );
  }

  if (tab === "participants") {
    if (contributors.length === 0) {
      return <EmptyPanel icon={Users} title="No participants yet" message="Once collections are recorded, the contributing members appear here." />;
    }
    const top = contributors[0];
    return (
      <div className="space-y-4">
        <div className="card-surface rounded-2xl p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">Top contributor</p>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={top.name} size="lg" />
            <div>
              <p className="text-[15px] font-extrabold">{top.name}</p>
              <p className="text-[12px] text-muted">{top.count} contribution{top.count > 1 ? "s" : ""} · {formatINR(top.total)}</p>
            </div>
            <span className="ml-auto text-3xl">🏆</span>
          </div>
        </div>
        <div className="card-surface overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <p className="text-[13.5px] font-extrabold">Participants · பங்கேற்பாளர்கள்</p>
            <Badge tone="navy">{contributors.length} donors</Badge>
          </div>
          <div className="divide-y divide-line">
            {contributors.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 px-5 py-3">
                <span className={cn("w-5 text-center text-[13px] font-black tabular-nums", i === 0 ? "text-gold-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-saffron-600" : "text-faint")}>
                  {i + 1}
                </span>
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">{c.name}</p>
                </div>
                <p className="text-[11px] text-faint">{c.count} ×</p>
                <p className="w-24 text-right text-[13.5px] font-extrabold tabular-nums">{formatINR(c.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tab === "games") {
    const kindOf = (k: GameListItem["kind"]) => GAME_KINDS.find((x) => x.value === k);
    return (
      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-extrabold">Games · விளையாட்டுகள் <span className="ml-1 text-[11.5px] font-semibold text-faint">{games.length} for this event</span></p>
          <Link href={`/games${event.id ? `?eventId=${event.id}` : ""}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-saffron-600 hover:underline dark:text-saffron-400">
            Open in Games <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {games.length === 0 ? (
          <EmptyPanel
            icon={Trophy}
            title="No games for this event yet"
            message="Create competitions — tug of war, running, cricket — and they appear here with teams and results."
            action={
              <Link href={`/games${event.id ? `?eventId=${event.id}` : ""}`}>
                <Button size="sm"><Plus className="size-4" /> Go to Games</Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {games.map((g) => {
              const km = kindOf(g.kind);
              return (
                <Link key={g.id} href={`/games/${g.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/70">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-lg dark:bg-navy-500/15">{km?.emoji ?? "🎯"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">{g.name}</p>
                    <p className="text-[11.5px] font-medium text-muted">
                      {g.participantCount} player{g.participantCount === 1 ? "" : "s"} · {g.mode === "team" ? `${g.teamCount} teams · ${g.playedCount} played` : "individual event"}
                    </p>
                  </div>
                  <GameStatusBadge status={g.status} />
                  <ChevronRight className="size-4 text-faint" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (tab === "photos") {
    return (
      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-extrabold">Photos · புகைப்படங்கள் <span className="ml-1 text-[11.5px] font-semibold text-faint">{photos.length}</span></p>
          <Link href={`/gallery${event.id ? `?eventId=${event.id}` : ""}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-saffron-600 hover:underline dark:text-saffron-400">
            Open Gallery <ChevronRight className="size-3.5" />
          </Link>
        </div>
        {photos.length === 0 ? (
          <EmptyPanel icon={Camera} title="No photos for this event yet" message="Add festival photos in the Gallery and they appear here for every member." action={
            <Link href={`/gallery${event.id ? `?eventId=${event.id}` : ""}`}><Button size="sm"><Plus className="size-4" /> Add photos</Button></Link>
          } />
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            {photos.slice(0, 8).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={p.caption ?? "Event photo"} className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // reports
  return (
    <div className="space-y-4">
      <div className="card-surface rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-navy-600 dark:text-navy-300" />
          <p className="text-[15px] font-extrabold">Event financial report</p>
        </div>
        <p className="mt-1 text-[12.5px] text-muted">Summary for “{event.name}” — computed live from the ledger.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ReportMini label="Collection · வரவு" value={formatINR(stats.varavu)} className="text-leaf-700 dark:text-leaf-400" />
          <ReportMini label="Expenses · செலவு" value={formatINR(stats.selavu)} className="text-red-600 dark:text-red-400" />
          <ReportMini label="Balance · இருப்பு" value={formatINR(stats.balance)} className={stats.balance >= 0 ? "text-navy-800 dark:text-navy-200" : "text-red-600"} />
        </div>
        <p className="mt-4 text-[11.5px] text-faint">
          {collections.length} collection{collections.length === 1 ? "" : "s"} · {expenses.length} expense{expenses.length === 1 ? "" : "s"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/reports"><Button size="sm"><BarChart3 className="size-3.5" /> Full report & export</Button></Link>
        </div>
      </div>
    </div>
  );
}

function GameStatusBadge({ status }: { status: GameStatus }) {
  const map: Record<GameStatus, { label: string; tone: "saffron" | "navy" | "leaf" | "gold" | "muted" }> = {
    open: { label: "Open", tone: "leaf" },
    ongoing: { label: "In Progress", tone: "saffron" },
    results: { label: "Results", tone: "gold" },
    completed: { label: "Completed", tone: "navy" },
  };
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function MoneyTab({
  title, emptyTitle, emptyMessage, total, children, link, linkLabel, ctaHref,
}: {
  title: string;
  emptyTitle: string;
  emptyMessage: string;
  total: number;
  children: React.ReactNode;
  link: string;
  linkLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="card-surface overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <p className="text-[13.5px] font-extrabold">{title}</p>
        <div className="flex items-center gap-3">
          <p className="text-[13.5px] font-bold tabular-nums">{formatINR(total)}</p>
          <Link href={ctaHref} className="inline-flex items-center gap-1 text-[12px] font-bold text-saffron-600 hover:underline dark:text-saffron-400">
            <Plus className="size-3.5" /> Add
          </Link>
          <Link href={link} className="inline-flex items-center gap-0.5 text-[12px] font-bold text-muted hover:text-ink">
            {linkLabel} <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </div>
      {total === 0 ? (
        <EmptyState icon={total === 0 ? (title.startsWith("வரவு") ? HandCoins : TrendingDown) : undefined} title={emptyTitle} message={emptyMessage} className="py-10" />
      ) : (
        children
      )}
    </div>
  );
}

function EmptyPanel({
  icon: Icon, title, message, action,
}: {
  icon: typeof Trophy; title: string; message: string; action?: React.ReactNode;
}) {
  return <EmptyState icon={Icon} title={title} message={message} action={action} />;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-faint">{icon}</span>
      <div>
        <dt className="text-[10.5px] font-bold uppercase tracking-wide text-faint">{label}</dt>
        <dd className="mt-0.5 font-semibold">{value}</dd>
      </div>
    </div>
  );
}

function ReportMini({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-faint">{label}</p>
      <p className={cn("mt-1 text-xl font-black tabular-nums", className)}>{value}</p>
    </div>
  );
}
