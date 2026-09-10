"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarRange, CheckCircle2, Eraser, HandCoins, Plus, ReceiptText, Search, SearchX, SlidersHorizontal, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Collection, CollectionInput, ContributionType, Event } from "@/lib/data/types";
import { PAYMENT_CHOICES } from "@/lib/data/types";
import type { CollectionPage } from "@/lib/data/repository";
import { api, qs } from "@/lib/client/api";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { useLang } from "@/lib/i18n";
import {
  translatePersonName,
  translateCategory,
  translateEventName,
  translatePaymentMethod,
} from "@/lib/utils/translateData";
import { cn } from "@/lib/utils/cn";
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
import { RowActions, type RowExtraAction } from "@/components/shared/RowActions";
import { PaymentLabel } from "@/components/shared/meta";
import { ReceiptDialog } from "@/components/receipt/ReceiptDialog";
import { formatINR } from "@/lib/utils/money";
import { formatShort } from "@/lib/utils/date";
import { CollectionForm } from "./CollectionForm";

const PER_PAGE = 10;

interface EventsPayload {
  events: (Event & { varavu?: number })[];
}

export function CollectionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useLang();
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
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(() => searchParams.get("add") === "1");
  const [editing, setEditing] = useState<Collection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [celebrate, setCelebrate] = useState<{ title: string; subtitle: string; amount?: string } | null>(null);
  const [receipt, setReceipt] = useState<Collection | null>(null);

  const url = useMemo(
    () =>
      `/api/collections${qs({
        q: debouncedQ, eventId, category, payment, from, to, sort, page, perPage: PER_PAGE,
      })}`,
    [debouncedQ, eventId, category, payment, from, to, sort, page],
  );
  const { data, loading, reload } = useFetch<CollectionPage>(url);
  const eventsFetch = useFetch<EventsPayload>("/api/events");

  const events = useMemo(() => eventsFetch.data?.events ?? [], [eventsFetch.data]);
  const eventName = useCallback(
    (id?: string | null) => {
      const ev = events.find((e) => e.id === id);
      return ev ? translateEventName(ev.name, ev.tamilName, lang) : t("General fund", "பொது நிதி");
    },
    [events, lang, t],
  );
  const hasFilters = Boolean(q || eventId || category || payment || from || to);

  // deep-link ?add=1 / ?eventId=x — state is initialised from the URL once
  useEffect(() => {
    if (searchParams.get("add") === "1") router.replace("/collections", { scroll: false });
  }, [searchParams, router]);

  // auto-dismiss success overlay
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 1900);
    return () => clearTimeout(t);
  }, [celebrate]);

  const clearFilters = () => {
    setQ(""); setEventId(""); setCategory(""); setPayment(""); setFrom(""); setTo(""); setPage(1);
  };

  const openAdd = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (rec: Collection) => {
    setEditing(rec);
    setFormError(null);
    setFormOpen(true);
  };
  const viewReceipt = (rec: Collection): RowExtraAction => ({
    label: t("View receipt", "ரசீது பார்க்க"),
    icon: ReceiptText,
    onSelect: () => setReceipt(rec),
  });

  const handleSubmit = async (input: CollectionInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/api/collections/${editing.id}`, input);
        toast.success(t("Collection updated", "வரவு புதுப்பிக்கப்பட்டது"));
      } else {
        const res = await api.post<{ collection: Collection }>("/api/collections", input);
        setCelebrate({
          title: t("Collection Added", "வரவு சேர்க்கப்பட்டது"),
          subtitle: `${t("Received from", "பெறப்பட்டது")} ${input.personName}`,
          amount: formatINR(input.amount),
        });
        toast.success(`${t("Receipt", "ரசீது")} ${res.collection.receiptNumber} ${t("issued", "வழங்கப்பட்டது")}`);
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
      await api.del(`/api/collections/${deleting.id}`);
      toast.success(t("Collection removed", "வரவு நீக்கப்பட்டது"));
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const items = data?.items ?? [];
  const filteredSum = data?.sum ?? 0;

  const sortedOptions = [
    { value: "newest", label: t("Newest first", "புதியவை முதலில்") },
    { value: "amount_desc", label: t("Highest amount", "அதிக தொகை") },
    { value: "amount_asc", label: t("Lowest amount", "குறைந்த தொகை") },
    { value: "name", label: t("Name A–Z", "பெயர் அகரவரிசை") },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Finance"
        eyebrowTa="நிதி"
        title="Collections"
        ta="வரவு"
        subtitle="Every contribution, receipt and donor of the Mandram"
        subtitleTa="மன்றத்தின் அனைத்து வரவுகள், ரசீதுகள் மற்றும் நன்கொடைகள்"
        actions={
          writable ? (
            <Button variant="primary" onClick={openAdd}>
              <Plus className="size-4" /> {t("Add Collection", "வரவு சேர்க்க")}
            </Button>
          ) : undefined
        }
      />

      {/* total banner */}
      <div className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-saffron-500/10 via-surface to-surface p-4 text-ink shadow-card sm:p-5 dark:border-line/80 dark:from-navy-950 dark:via-navy-900 dark:to-navy-800 dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron-500/30 bg-saffron-500/15 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-saffron-700 dark:border-transparent dark:bg-saffron-500/20 dark:text-saffron-300">
              {t("Total Collection", "மொத்த வரவு")}
            </span>
            <p className="mt-1 text-[24px] font-black leading-tight tracking-tight text-ink dark:text-white sm:text-[28px] tabular-nums">
              {formatINR(filteredSum)}
            </p>
            <p className="text-[11.5px] text-muted dark:text-navy-200/80">
              {hasFilters
                ? t(`filtered from ${formatINR(data?.allSum ?? 0)} overall`, `மொத்தம் ${formatINR(data?.allSum ?? 0)} இலிருந்து`)
                : t("all contributions received", "பெறப்பட்ட அனைத்து வரவுகள்")}
            </p>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="rounded-xl border border-line bg-surface-2/80 px-3 py-1.5 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-base font-extrabold tabular-nums leading-none text-ink dark:text-white sm:text-lg">{data?.total ?? "–"}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted dark:text-navy-200/75">{t("Receipts", "ரசீதுகள்")}</p>
            </div>
            {data && data.total > 0 && (
              <div className="hidden rounded-xl border border-line bg-surface-2/80 px-3 py-1.5 text-center dark:border-white/10 dark:bg-white/5 sm:block">
                <p className="text-base font-extrabold tabular-nums leading-none text-ink dark:text-white sm:text-lg">{formatINR(Math.round(filteredSum / data.total))}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted dark:text-navy-200/75">{t("Average", "சராசரி")}</p>
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
              placeholder={t("Search donor, street, receipt…", "நன்கொடையாளர், தெரு, ரசீது தேடுங்கள்…")}
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
              showFilters || (eventId || payment || from || to || sort !== "newest")
                ? "border-saffron-500 bg-saffron-50 text-saffron-900 shadow-sm dark:bg-saffron-500/15 dark:text-saffron-300"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
            )}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">{t("Filters", "வடிகட்டி")}</span>
            {(eventId ? 1 : 0) + (payment ? 1 : 0) + (from || to ? 1 : 0) + (sort !== "newest" ? 1 : 0) > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-saffron-500 text-[10px] font-black text-white">
                {(eventId ? 1 : 0) + (payment ? 1 : 0) + (from || to ? 1 : 0) + (sort !== "newest" ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => { setCategory(""); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              category === ""
                ? "bg-navy-900 text-white dark:bg-saffron-500 dark:text-ink shadow-sm"
                : "border border-line bg-surface-2/60 text-muted hover:text-ink"
            )}
          >
            {t("All", "அனைத்தும்")}
          </button>
          <button
            type="button"
            onClick={() => { setCategory(category === "ஊர் வசூல்" ? "" : "ஊர் வசூல்"); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              category === "ஊர் வசூல்"
                ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-ink shadow-sm"
                : "border border-line bg-surface-2/60 text-muted hover:text-ink"
            )}
          >
            🏘️ {t("Oor Vasul", "ஊர் வசூல்")}
          </button>
          <button
            type="button"
            onClick={() => { setCategory(category === "மன்றம் வசூல்" ? "" : "மன்றம் வசூல்"); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              category === "மன்றம் வசூல்"
                ? "bg-purple-700 text-white dark:bg-purple-600 dark:text-white shadow-sm"
                : "border border-line bg-surface-2/60 text-muted hover:text-ink"
            )}
          >
            👥 {t("Mandram Vasul", "மன்றம் வசூல்")}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Eraser className="size-3" /> {t("Clear", "அழி")}
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
              <div className="pt-2.5 border-t border-line grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[12px]">
                <div>
                  <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">{t("Event", "நிகழ்வு")}</label>
                  <Select value={eventId} onChange={(e) => { setEventId(e.target.value); setPage(1); }} className="w-full text-[12.5px] h-9">
                    <option value="">{t("All events", "அனைத்து நிகழ்வுகள்")}</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{t(ev.name, ev.tamilName)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">{t("Payment", "செலுத்திய முறை")}</label>
                  <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }} className="w-full text-[12.5px] h-9">
                    <option value="">{t("All payments", "அனைத்து முறைகள்")}</option>
                    {PAYMENT_CHOICES.map((m) => (
                      <option key={m.value} value={m.value}>{t(m.label, m.ta)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">{t("Sort", "வரிசைப்படுத்து")}</label>
                  <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full text-[12.5px] h-9">
                    {sortedOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">{t("Date Range", "தேதி வரம்பு")}</label>
                  <div className="flex items-center gap-1">
                    <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="flex-1 text-[11.5px] h-9 px-2" />
                    <span className="text-faint">–</span>
                    <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="flex-1 text-[11.5px] h-9 px-2" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* results */}
      <div className="card-surface rounded-2xl">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-2.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={hasFilters ? SearchX : HandCoins}
            title={hasFilters ? t("No matching collections", "பொருந்தும் வரவுகள் இல்லை") : t("No collections yet", "வரவுகள் இன்னும் இல்லை")}
            message={
              hasFilters
                ? t("Try adjusting or clearing the filters above.", "வடிகட்டிகளை மாற்றி அல்லது அழித்து பார்க்கவும்.")
                : t("Start recording your first contribution for the Mandram.", "மன்றத்திற்கான முதல் வரவை பதிவு செய்யுங்கள்.")
            }
            action={
              writable && !hasFilters ? (
                <Button variant="primary" onClick={openAdd}>
                  <Plus className="size-4" /> {t("Add Collection", "வரவு சேர்க்க")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-2/70 text-[10.5px] font-bold uppercase tracking-[0.1em] text-faint">
                    <th className="px-5 py-3">{t("Name", "பெயர்")}</th>
                    <th className="px-4 py-3 text-right">{t("Amount", "தொகை")}</th>
                    <th className="px-4 py-3">{t("Payment", "கட்டண முறை")}</th>
                    <th className="px-4 py-3">{t("Date", "தேதி")}</th>
                    <th className="px-4 py-3">{t("Event", "நிகழ்வு")}</th>
                    <th className="px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="group border-b border-line/70 text-[13px] transition-colors last:border-0 hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="font-bold">{translatePersonName(c.personName, lang)}</p>
                          <CategoryBadge category={c.category} street={c.street} />
                          <TypeBadge type={c.contributionType} />
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-faint">
                          {c.street && c.street !== c.category && <span>{c.street}</span>}
                          {c.contributionType === "namePhone" && c.phone && (
                            <span>{c.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{formatINR(c.amount)}</td>
                      <td className="px-4 py-3"><PaymentLabel method={c.paymentMethod} /></td>
                      <td className="px-4 py-3 text-muted">{formatShort(c.date)}</td>
                      <td className="max-w-40 px-4 py-3">
                        <p className="truncate text-muted">{eventName(c.eventId)}</p>
                      </td>
                      <td className="px-2 py-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <RowActions extras={[viewReceipt(c)]} onEdit={writable ? () => openEdit(c) : undefined} onDelete={writable ? () => setDeleting(c) : undefined} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards matching reference layout */}
            <div className="divide-y divide-line/60 md:hidden">
              {items.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setReceipt(c)}
                  className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2/40 active:bg-surface-2/60 cursor-pointer"
                >
                  {/* Circular Avatar with Initial */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink/85 dark:bg-white/10 dark:text-white border border-line/40 text-[15px] font-bold shadow-sm">
                    {translatePersonName(c.personName, lang).slice(0, 1)}
                  </div>

                  {/* Middle Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold tracking-tight text-ink dark:text-white">
                      {translatePersonName(c.personName, lang)}
                    </p>
                    <div className="mt-1 flex items-center">
                      <CategoryBadge category={c.category} street={c.street} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-faint">
                      <span>{translatePaymentMethod(c.paymentMethod, lang)}</span>
                      <span>•</span>
                      <span>{formatShort(c.date)}</span>
                    </p>
                  </div>

                  {/* Right Column: Amount & Status Pill */}
                  <div className="flex flex-col items-end shrink-0 gap-1 pl-2 text-right">
                    <p className="text-[15.5px] font-black tabular-nums tracking-tight text-ink dark:text-white">
                      {formatINR(c.amount)}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-3 shrink-0" />
                      {t("Received", "பெறப்பட்டது")}
                    </span>
                  </div>

                  {/* Admin quick actions (only if writable, placed cleanly) */}
                  {writable && (
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mr-1.5">
                      <RowActions
                        extras={[viewReceipt(c)]}
                        canEdit={writable}
                        canDelete={writable}
                        onEdit={() => openEdit(c)}
                        onDelete={() => setDeleting(c)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Pagination
              page={data?.page ?? 1}
              pages={data?.pages ?? 1}
              total={data?.total ?? 0}
              pageSize={PER_PAGE}
              onChange={setPage}
              className="px-4 sm:px-5"
            />
          </>
        )}
      </div>

      {/* add/edit modal */}
      <Modal
        open={formOpen}
        onClose={() => { if (!submitting) { setFormOpen(false); setEditing(null); } }}
        title={editing ? t("Edit Collection", "வரவு திருத்து") : t("Add Collection", "வரவு சேர்க்க")}
        description={editing ? `${t("Receipt", "ரசீது")} ${editing.receiptNumber} · ${formatShort(editing.date)}` : t("Record a new contribution — a receipt number is generated automatically", "புதிய வரவைப் பதிவு செய்யுங்கள் — ரசீது எண் தானாக உருவாக்கப்படும்")}
        maxWidth="max-w-xl"
      >
        <CollectionForm
          events={events}
          initial={editing}
          submitting={submitting}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteBusy}
        title={t("Delete this collection?", "இந்த வரவை நீக்கவா?")}
        body={
          <>
            {t("This removes", "இது")} <b>{translatePersonName(deleting?.personName ?? "", lang)}</b>
            {t("’s contribution of ", " அவர்களின் நன்கொடை ")}
            <b>{deleting ? formatINR(deleting.amount) : ""}</b>
            {t(" and its receipt. The action is recorded in the audit log.", " மற்றும் அதன் ரசீதை நீக்கும். இந்த நடவடிக்கை தணிக்கை பதிவேட்டில் பதிவு செய்யப்படும்.")}
          </>
        }
        confirmLabel={t("Delete", "நீக்கு")}
      />

      <SuccessOverlay
        open={Boolean(celebrate)}
        title={celebrate?.title ?? ""}
        subtitle={celebrate?.subtitle}
        amount={celebrate?.amount}
      />

      <ReceiptDialog
        collection={receipt}
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        onEdit={writable ? openEdit : undefined}
        onDelete={writable ? (c) => setDeleting(c) : undefined}
      />
    </div>
  );
}

function TypeBadge({ type }: { type: ContributionType }) {
  const { t } = useLang();
  if (type === "voice") {
    return <Badge tone="saffron" className="px-1.5 py-0 text-[9px]">🎙 {t("Voice", "குரல் பதிவு")}</Badge>;
  }
  if (type === "name") {
    return <Badge tone="muted" className="px-1.5 py-0 text-[9px]">{t("Name only", "பெயர் மட்டும்")}</Badge>;
  }
  return null;
}

function CategoryBadge({ category, street }: { category?: string | null; street?: string | null }) {
  const { lang, t } = useLang();
  const rawCat = category || (street?.includes("வசூல்") ? street : "ஊர் வசூல்");
  const isMandram = rawCat.includes("மன்றம்") || rawCat.toLowerCase().includes("mandram");
  const isOor = rawCat.includes("ஊர்") || rawCat.toLowerCase().includes("oor") || rawCat.toLowerCase().includes("village");

  const label = isMandram
    ? t("Mandram Vasul", "மன்றம் வசூல்")
    : isOor
    ? t("Oor Vasul", "ஊர் வசூல்")
    : translateCategory(rawCat, lang);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-sm",
        isMandram
          ? "bg-purple-100 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/40"
          : isOor
          ? "bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40"
          : "bg-surface-2 text-muted border border-line"
      )}
    >
      {isMandram ? "👥" : isOor ? "🏘️" : "🏷️"} {label}
    </span>
  );
}

