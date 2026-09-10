"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarRange, Eraser, Eye, Plus, SearchX, SlidersHorizontal, TrendingDown,
} from "lucide-react";
import type { Expense, ExpenseInput, Event } from "@/lib/data/types";
import { EXPENSE_CATEGORIES, PAYMENT_CHOICES } from "@/lib/data/types";
import type { ExpensePage } from "@/lib/data/repository";
import { api, qs } from "@/lib/client/api";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { RowActions } from "@/components/shared/RowActions";
import { categoryTone } from "@/components/shared/meta";
import { formatINR } from "@/lib/utils/money";
import { formatShort } from "@/lib/utils/date";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseDetail } from "./ExpenseDetail";

const PER_PAGE = 10;
interface EventsPayload { events: Event[] }

export function ExpensesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const writable = can.finances;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 280);
  const [eventId, setEventId] = useState(() => searchParams.get("eventId") ?? "");
  const [category, setCategory] = useState("");
  const [payment, setPayment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(() => searchParams.get("add") === "1");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [celebrate, setCelebrate] = useState<{ title: string; subtitle?: string; amount?: string } | null>(null);

  const url = useMemo(
    () => `/api/expenses${qs({ q: debouncedQ, eventId, category, payment, from, to, sort, page, perPage: PER_PAGE })}`,
    [debouncedQ, eventId, category, payment, from, to, sort, page],
  );
  const { data, loading, reload } = useFetch<ExpensePage>(url);
  const eventsFetch = useFetch<EventsPayload>("/api/events");
  const events = useMemo(() => eventsFetch.data?.events ?? [], [eventsFetch.data]);
  const eventName = useCallback((id?: string | null) => events.find((e) => e.id === id)?.name, [events]);
  const hasFilters = Boolean(q || eventId || category || payment || from || to);

  useEffect(() => {
    if (searchParams.get("add") === "1") router.replace("/expenses", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 1900);
    return () => clearTimeout(t);
  }, [celebrate]);

  const clearFilters = () => { setQ(""); setEventId(""); setCategory(""); setPayment(""); setFrom(""); setTo(""); setPage(1); };

  const openAdd = () => { setEditing(null); setFormError(null); setFormOpen(true); };
  const openEdit = (rec: Expense) => { setEditing(rec); setFormError(null); setFormOpen(true); setViewing(null); };

  const handleSubmit = async (input: ExpenseInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/api/expenses/${editing.id}`, input);
        toast.success("Expense updated");
      } else {
        await api.post<{ expense: Expense }>("/api/expenses", input);
        setCelebrate({ title: "Expense Added", subtitle: `Recorded ${input.title}`, amount: formatINR(input.amount) });
        toast.success("Expense recorded");
      }
      setFormOpen(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.del(`/api/expenses/${deleting.id}`);
      toast.success("Expense removed");
      setDeleting(null);
      setViewing(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const items = data?.items ?? [];
  const filteredSum = data?.sum ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Finance"
        title="செலவு"
        ta="Expenses · money spent"
        subtitle="Every expense of the Mandram — transparent and audited"
        actions={
          writable ? (
            <Button variant="primary" onClick={openAdd}>
              <Plus className="size-4" /> Add Expense
            </Button>
          ) : undefined
        }
      />

      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="relative flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#3a1a30] via-[#57223f] to-[#7a2d40] px-5 py-4 text-white sm:px-6">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-gold-300">
              Total Expenses · மொத்த செலவு
            </p>
            <p className="mt-1 text-[26px] font-black leading-none tracking-tight tabular-nums">
              {formatINR(filteredSum)}
            </p>
            <p className="mt-1 text-[11.5px] text-white/75">
              {hasFilters ? `filtered from ${formatINR(data?.allSum ?? 0)} overall` : "spent across all events & general"}
            </p>
          </div>
          <div className="flex gap-5 text-center">
            <div>
              <p className="text-lg font-extrabold tabular-nums">{data?.total ?? "–"}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Entries</p>
            </div>
            <div className="hidden sm:block">
              <p className="text-lg font-extrabold tabular-nums">{data && data.total > 0 ? formatINR(Math.round(filteredSum / data.total)) : "–"}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Avg expense</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search title, paid by…"
            className="min-w-44 flex-1"
          />
          <Select value={eventId} onChange={(e) => { setEventId(e.target.value); setPage(1); }} className="min-w-36">
            <option value="">All events</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </Select>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="min-w-36">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </Select>
          <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="min-w-32">
            <option value="">All payments</option>
            {PAYMENT_CHOICES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
          <div className="flex items-center gap-1.5 text-faint">
            <CalendarRange className="size-4" />
            <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-36" aria-label="From date" />
            <span>–</span>
            <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-36" aria-label="To date" />
          </div>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="min-w-36">
            <option value="newest">Newest first</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
            <option value="title">Title A–Z</option>
          </Select>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <Eraser className="size-3.5" /> Clear
            </Button>
          ) : (
            <span className="hidden items-center gap-1.5 px-1 text-[11.5px] font-medium text-faint md:inline-flex">
              <SlidersHorizontal className="size-3.5" /> Filter & sort
            </span>
          )}
        </div>
      </div>

      <div className="card-surface overflow-hidden rounded-2xl">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-2.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? SearchX : TrendingDown}
            tone={hasFilters ? "navy" : "saffron"}
            title={hasFilters ? "No matching expenses" : "No expenses yet"}
            message={
              hasFilters
                ? "Try adjusting or clearing the filters above."
                : "Record the first expense to keep the Mandram fully transparent."
            }
            action={writable && !hasFilters ? (
              <Button variant="primary" onClick={openAdd}><Plus className="size-4" /> Add Expense</Button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2/70 text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">
                    <th className="px-5 py-3">Expense</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Paid by</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} className="group border-b border-line/70 text-[13px] transition-colors last:border-0 hover:bg-surface-2/50">
                      <td className="max-w-52 px-5 py-3">
                        <p className="truncate font-bold">{e.title}</p>
                        <p className="mt-0.5 text-[11px] text-faint">{e.billUrl ? "has bill photo" : "no bill attached"}</p>
                      </td>
                      <td className="px-4 py-3"><Badge tone={categoryTone(e.category)}>{e.category}</Badge></td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600 dark:text-red-400">− {formatINR(e.amount)}</td>
                      <td className="px-4 py-3 text-muted">{e.paidBy}</td>
                      <td className="max-w-36 px-4 py-3"><p className="truncate text-muted">{eventName(e.eventId) ?? <span className="text-faint">General</span>}</p></td>
                      <td className="px-4 py-3 text-muted">{formatShort(e.date)}</td>
                      <td className="px-2 py-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowActions
                          extras={[{ label: "View", icon: Eye, onSelect: () => setViewing(e) }]}
                          onEdit={writable ? () => openEdit(e) : undefined}
                          onDelete={writable ? () => setDeleting(e) : undefined}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-line md:hidden">
              {items.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                    <TrendingDown className="size-5" />
                  </div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setViewing(e)}>
                    <p className="truncate text-[14px] font-bold">{e.title}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted">
                      {e.category} · {e.paidBy} · {eventName(e.eventId) ?? "General"}
                    </p>
                  </button>
                  <div className="text-right">
                    <p className="text-[15px] font-extrabold tabular-nums text-red-600 dark:text-red-400">− {formatINR(e.amount)}</p>
                    <p className="text-[10.5px] text-faint">{formatShort(e.date)}</p>
                  </div>
                  <RowActions
                    canEdit={writable} canDelete={writable}
                    extras={[{ label: "View", icon: Eye, onSelect: () => setViewing(e) }]}
                    onEdit={() => openEdit(e)}
                    onDelete={() => setDeleting(e)}
                  />
                </div>
              ))}
            </div>
            <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} total={data?.total ?? 0} pageSize={PER_PAGE} onChange={setPage} className="px-4 sm:px-5" />
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => { if (!submitting) { setFormOpen(false); setEditing(null); } }}
        title={editing ? "Edit Expense" : "Add Expense"}
        description="செலவு பதிவு · record what the Mandram spent and on what"
        maxWidth="max-w-xl"
      >
        <ExpenseForm
          events={events}
          initial={editing}
          submitting={submitting}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ExpenseDetail
        expense={viewing}
        eventName={eventName(viewing?.eventId)}
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        onEdit={() => viewing && openEdit(viewing)}
        onDelete={() => viewing && setDeleting(viewing)}
        writable={writable}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteBusy}
        title="Delete this expense?"
        body={
          <>
            This removes <b>{deleting?.title}</b> ({deleting ? formatINR(deleting.amount) : ""}). The action is recorded in the audit log.
          </>
        }
        confirmLabel="Delete"
      />

      <SuccessOverlay open={Boolean(celebrate)} title={celebrate?.title ?? ""} subtitle={celebrate?.subtitle} amount={celebrate?.amount} />
    </div>
  );
}
