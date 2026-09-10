"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, ReceiptText, SearchX } from "lucide-react";
import type { Collection, Event } from "@/lib/data/types";
import type { CollectionPage } from "@/lib/data/repository";
import { qs } from "@/lib/client/api";
import { useDebouncedValue, useFetch } from "@/lib/client/hooks";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { PaymentLabel } from "@/components/shared/meta";
import { formatINR } from "@/lib/utils/money";
import { formatShort } from "@/lib/utils/date";
import { ReceiptDialog } from "./ReceiptDialog";

interface EventsPayload { events: Event[] }

export function ReceiptsView() {
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 250);
  const [eventId, setEventId] = useState("");
  const { data, loading } = useFetch<CollectionPage>(
    `/api/collections${qs({ q: debounced, eventId, perPage: 200, sort: "newest" })}`,
  );
  const eventsFetch = useFetch<EventsPayload>("/api/events");
  const events = useMemo(() => eventsFetch.data?.events ?? [], [eventsFetch.data]);

  const [active, setActive] = useState<Collection | null>(null);
  const items = data?.items ?? [];
  const eventName = (id?: string | null) => events.find((e) => e.id === id)?.name;

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Receipts · ரசீதுகள்"
        title="Receipts"
        ta="ரசீதுகள் · numbered & printable"
        subtitle="Every contribution carries its own NBM receipt — view, print or share any of them"
      />

      <div className="card-surface rounded-2xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or receipt number…"
            className="min-w-48 flex-1"
            leading={<ReceiptText className="size-4 text-faint" />}
          />
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)} className="min-w-40">
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="card-surface overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-extrabold">All receipts <span className="ml-1 text-[11.5px] font-semibold text-faint">{data?.total ?? "…"} issued</span></p>
          <Badge tone="navy">{data?.sum ? formatINR(data.sum) : ""} collected</Badge>
        </div>
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-2.5">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-44" /><Skeleton className="h-3 w-28" /></div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={q || eventId ? SearchX : ReceiptText}
            title={q || eventId ? "No matching receipts" : "No receipts yet"}
            message={q || eventId ? "Try another name or receipt number." : "Add a collection and its numbered receipt appears here instantly."}
          />
        ) : (
          <div className="divide-y divide-line">
            {items.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.4) }}
                onClick={() => setActive(c)}
                className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-surface-2/70"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 font-mono text-[10px] font-black text-white dark:from-saffron-500 dark:to-saffron-600 dark:text-navy-950">
                  {c.receiptNumber.slice(-4)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">{c.personName}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] font-medium text-faint">
                    {c.receiptNumber} · {eventName(c.eventId) ?? "General fund"} · {formatShort(c.date)}
                  </p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <PaymentLabel method={c.paymentMethod} />
                </div>
                <p className="text-right text-[15px] font-extrabold tabular-nums">{formatINR(c.amount)}</p>
                <Eye className="ml-1 size-4 shrink-0 text-faint" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <ReceiptDialog collection={active} open={Boolean(active)} onClose={() => setActive(null)} />
    </div>
  );
}
