"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2, Eraser, Eye, Plus, Search, SearchX, SlidersHorizontal, TrendingDown, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Expense, ExpenseInput, Event } from "@/lib/data/types";
import { PAYMENT_CHOICES } from "@/lib/data/types";
import type { ExpensePage } from "@/lib/data/repository";
import { api, qs } from "@/lib/client/api";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { useLang } from "@/lib/i18n";
import {
  translateExpenseTitle,
  translateEventName,
  translatePaymentMethod,
} from "@/lib/utils/translateData";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SuccessOverlay } from "@/components/ui/SuccessOverlay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { RowActions } from "@/components/shared/RowActions";
import { PaymentLabel, paymentMeta } from "@/components/shared/meta";
import { formatINR } from "@/lib/utils/money";
import { formatShort } from "@/lib/utils/date";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseDetail } from "./ExpenseDetail";

const PER_PAGE = 10;
interface EventsPayload { events: Event[] }

export function ExpensesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useLang();
  const { can } = usePermissions();
  const writable = can.finances;

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 280);
  const [eventId, setEventId] = useState(() => searchParams.get("eventId") ?? "");
  const [payment, setPayment] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(() => searchParams.get("add") === "1");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [celebrate, setCelebrate] = useState<{ title: string; subtitle?: string; amount?: string } | null>(null);

  const url = useMemo(
    () => `/api/expenses${qs({ q: debouncedQ, eventId, payment, page, perPage: PER_PAGE })}`,
    [debouncedQ, eventId, payment, page],
  );
  const { data, loading, reload } = useFetch<ExpensePage>(url);
  const eventsFetch = useFetch<EventsPayload>("/api/events");
  const events = useMemo(() => eventsFetch.data?.events ?? [], [eventsFetch.data]);
  const eventName = useCallback(
    (id?: string | null) => {
      const ev = events.find((e) => e.id === id);
      return ev ? translateEventName(ev.name, ev.tamilName, lang) : t("General", "பொது நிதி");
    },
    [events, lang, t],
  );
  const hasFilters = Boolean(q || eventId || payment);

  useEffect(() => {
    if (searchParams.get("add") === "1") router.replace("/expenses", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 1900);
    return () => clearTimeout(t);
  }, [celebrate]);

  const clearFilters = () => { setQ(""); setEventId(""); setPayment(""); setPage(1); };

  const openAdd = () => { setEditing(null); setFormError(null); setFormOpen(true); };
  const openEdit = (rec: Expense) => { setEditing(rec); setFormError(null); setFormOpen(true); setViewing(null); };

  const handleSubmit = async (input: ExpenseInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/api/expenses/${editing.id}`, input);
        toast.success(t("Expense updated", "செலவு புதுப்பிக்கப்பட்டது"));
      } else {
        await api.post<{ expense: Expense }>("/api/expenses", input);
        setCelebrate({
          title: t("Expense Added", "செலவு சேர்க்கப்பட்டது"),
          subtitle: `${t("Recorded", "பதிவு செய்யப்பட்டது")} ${input.title}`,
          amount: formatINR(input.amount),
        });
        toast.success(t("Expense recorded", "செலவு பதிவு செய்யப்பட்டது"));
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
      toast.success(t("Expense removed", "செலவு நீக்கப்பட்டது"));
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
      {writable && (
        <div className="flex items-center justify-end">
          <Button variant="primary" size="sm" onClick={openAdd}>
            <Plus className="size-4" /> {t("Add Expense", "செலவு சேர்க்க")}
          </Button>
        </div>
      )}

      {/* total banner */}
      <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-red-500/10 via-surface to-surface p-4 text-ink shadow-card sm:p-5 dark:border-line/80 dark:from-[#2a1222] dark:via-[#431932] dark:to-[#5a2132] dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red-700 dark:border-transparent dark:bg-gold-400/20 dark:text-gold-300">
              {t("Total Expenses", "மொத்த செலவு")}
            </span>
            <p className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink dark:text-white sm:text-[28px] tabular-nums">
              {formatINR(filteredSum)}
            </p>
            <p className="text-[11.5px] text-muted dark:text-white/75">
              {hasFilters
                ? t(`filtered from ${formatINR(data?.allSum ?? 0)} overall`, `மொத்தம் ${formatINR(data?.allSum ?? 0)} இலிருந்து`)
                : t("spent across all events & general", "அனைத்து நிகழ்வுகள் மற்றும் பொது செலவுகள்")}
            </p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="rounded-xl border border-line bg-surface-2/80 px-3 py-1.5 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-base font-extrabold tabular-nums leading-none text-ink dark:text-white sm:text-lg">{data?.total ?? "–"}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted dark:text-white/70">{t("Entries", "செலவு பதிவுகள்")}</p>
            </div>
            {data && data.total > 0 && (
              <div className="hidden rounded-xl border border-line bg-surface-2/80 px-3 py-1.5 text-center dark:border-white/10 dark:bg-white/5 sm:block">
                <p className="text-base font-extrabold tabular-nums leading-none text-ink dark:text-white sm:text-lg">{formatINR(Math.round(filteredSum / data.total))}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted dark:text-white/70">{t("Average", "சராசரி")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="card-surface rounded-2xl p-3 sm:p-4 space-y-2.5">
        {/* Search Bar + Filter Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-faint" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={t("Search expense title…", "செலவுத் தலைப்பைத் தேடுங்கள்…")}
              className="h-10.5 w-full rounded-full border border-line bg-surface-2/60 pl-10 pr-8 text-[13px] outline-none transition-colors placeholder:text-faint focus:border-saffron-500 focus:bg-surface focus:ring-2 focus:ring-saffron-500/20"
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-faint hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "flex h-10.5 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-bold transition-all shrink-0",
              showFilters || (eventId || payment)
                ? "border-saffron-500 bg-saffron-50 text-saffron-900 shadow-sm dark:bg-saffron-500/15 dark:text-saffron-300"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">{t("Filters", "வடிகட்டி")}</span>
            {(eventId ? 1 : 0) + (payment ? 1 : 0) > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-saffron-500 text-[10px] font-black text-white">
                {(eventId ? 1 : 0) + (payment ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Quick Payment Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => { setPayment(""); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              payment === ""
                ? "bg-navy-900 text-white dark:bg-saffron-500 dark:text-ink shadow-sm"
                : "border border-line bg-surface-2/60 text-muted hover:text-ink"
            )}
          >
            {t("All", "அனைத்தும்")}
          </button>
          {PAYMENT_CHOICES.map((m) => {
            const active = payment === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => { setPayment(active ? "" : m.value); setPage(1); }}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
                  active
                    ? "bg-navy-900 text-white dark:bg-saffron-500 dark:text-ink shadow-sm"
                    : "border border-line bg-surface-2/60 text-muted hover:text-ink"
                )}
              >
                {t(m.label, m.ta)}
              </button>
            );
          })}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Eraser className="size-3.5" /> {t("Clear", "அழி")}
            </button>
          )}
        </div>

        {/* Expandable Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2.5 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[12px]">
                <div>
                  <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">{t("Event", "நிகழ்வு")}</label>
                  <Select value={eventId} onChange={(e) => { setEventId(e.target.value); setPage(1); }} className="w-full text-[12.5px] h-9">
                    <option value="">{t("All events", "அனைத்து நிகழ்வுகள்")}</option>
                    {events.map((ev) => <option key={ev.id} value={ev.id}>{t(ev.name, ev.tamilName)}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">{t("Payment Method", "செலுத்திய முறை")}</label>
                  <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="w-full text-[12.5px] h-9">
                    <option value="">{t("All payments", "அனைத்து முறைகள்")}</option>
                    {PAYMENT_CHOICES.map((m) => <option key={m.value} value={m.value}>{t(m.label, m.ta)}</option>)}
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="card-surface rounded-2xl">
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
            title={hasFilters ? t("No matching expenses", "பொருந்தும் செலவுகள் இல்லை") : t("No expenses yet", "செலவுகள் இன்னும் இல்லை")}
            message={
              hasFilters
                ? t("Try adjusting or clearing the filters above.", "வடிகட்டிகளை மாற்றி அல்லது அழித்து பார்க்கவும்.")
                : t("Record the first expense to keep the Mandram fully transparent.", "மன்ற செலவை பதிவு செய்யுங்கள்.")
            }
            action={writable && !hasFilters ? (
              <Button variant="primary" onClick={openAdd}><Plus className="size-4" /> {t("Add Expense", "செலவு சேர்க்க")}</Button>
            ) : undefined}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2/70 text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">
                    <th className="px-5 py-3">{t("Expense", "செலவு")}</th>
                    <th className="px-4 py-3 text-right">{t("Amount", "தொகை")}</th>
                    <th className="px-4 py-3">{t("Payment", "கட்டண முறை")}</th>
                    <th className="px-4 py-3">{t("Event", "நிகழ்வு")}</th>
                    <th className="px-4 py-3">{t("Date", "தேதி")}</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} className="group border-b border-line/70 text-[13px] transition-colors last:border-0 hover:bg-surface-2/50">
                      <td className="max-w-64 px-5 py-3">
                        <p className="truncate font-bold">{translateExpenseTitle(e.title, lang)}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600 dark:text-red-400">− {formatINR(e.amount)}</td>
                      <td className="px-4 py-3"><PaymentLabel method={e.paymentMethod} /></td>
                      <td className="max-w-36 px-4 py-3"><p className="truncate text-muted">{eventName(e.eventId)}</p></td>
                      <td className="px-4 py-3 text-muted">{formatShort(e.date)}</td>
                      <td className="px-2 py-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowActions
                          extras={[{ label: t("View", "பார்க்க"), icon: Eye, onSelect: () => setViewing(e) }]}
                          onEdit={writable ? () => openEdit(e) : undefined}
                          onDelete={writable ? () => setDeleting(e) : undefined}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards matching reference layout */}
            <div className="divide-y divide-line/60 md:hidden">
              {items.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setViewing(e)}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2/40 active:bg-surface-2/60 cursor-pointer"
                >
                  {/* Circular Icon Avatar */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 dark:bg-red-500/15 dark:text-red-400 border border-red-500/20 text-[15px] shadow-sm">
                    <TrendingDown className="size-5" />
                  </div>

                  {/* Middle Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold tracking-tight text-ink dark:text-white">
                      {translateExpenseTitle(e.title, lang)}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-medium text-muted dark:text-navy-200/70">
                      {eventName(e.eventId)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
                      <span>{translatePaymentMethod(e.paymentMethod, lang)}</span>
                      <span>•</span>
                      <span>{formatShort(e.date)}</span>
                    </p>
                  </div>

                  {/* Right Column: Amount & Status Pill */}
                  <div className="flex flex-col items-end shrink-0 gap-1 pl-2 text-right">
                    <p className="text-[15.5px] font-black tabular-nums tracking-tight text-red-600 dark:text-red-400">
                      − {formatINR(e.amount)}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-500/20">
                      <CheckCircle2 className="size-3 shrink-0" />
                      {t("Paid", "செலுத்தப்பட்டது")}
                    </span>
                  </div>

                  {/* Admin quick actions */}
                  {writable && (
                    <div onClick={(ev) => ev.stopPropagation()} className="shrink-0 -mr-1.5">
                      <RowActions
                        canEdit={writable}
                        canDelete={writable}
                        extras={[{ label: t("View", "பார்க்க"), icon: Eye, onSelect: () => setViewing(e) }]}
                        onEdit={() => openEdit(e)}
                        onDelete={() => setDeleting(e)}
                      />
                    </div>
                  )}
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
        title={editing ? t("Edit Expense", "செலவு திருத்து") : t("Add Expense", "செலவு சேர்க்க")}
        description={t("Record what the Mandram spent", "மன்றம் செய்த செலவை பதிவு செய்யவும்")}
        maxWidth="max-w-md"
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
        title={t("Delete this expense?", "இந்த செலவை நீக்கவா?")}
        body={
          <>
            {t("This removes", "இது")} <b>{translateExpenseTitle(deleting?.title ?? "", lang)}</b> ({deleting ? formatINR(deleting.amount) : ""}). {t("The action is recorded in the audit log.", "இந்த நடவடிக்கை தணிக்கை பதிவேட்டில் பதிவு செய்யப்படும்.")}
          </>
        }
        confirmLabel={t("Delete", "நீக்கு")}
      />
      <SuccessOverlay open={Boolean(celebrate)} title={celebrate?.title ?? ""} subtitle={celebrate?.subtitle} amount={celebrate?.amount} />
    </div>
  );
}
