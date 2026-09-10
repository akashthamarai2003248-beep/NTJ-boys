"use client";

import type { Collection, Event } from "@/lib/data/types";
import { paymentMeta } from "@/components/shared/meta";
import { LogoMark } from "@/components/ui/Logo";
import { formatINR, rupeesInWords } from "@/lib/utils/money";
import { formatLong } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

/** Presentational receipt card — used on screen and in the print sheet. */
export function ReceiptSheet({
  collection,
  event,
  className,
}: {
  collection: Collection;
  event?: Event | null;
  className?: string;
}) {
  const method = paymentMeta[collection.paymentMethod];
  const eventLabel = event
    ? `${event.tamilName || event.name}`
    : "General Fund · பொது நிதி";
  return (
    <div
      className={cn(
        "receipt-card mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-line bg-white text-[#141d33] shadow-card",
        className,
      )}
    >
      {/* header */}
      <div className="relative overflow-hidden bg-[#101f42] px-6 pb-5 pt-6 text-white">
        <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[#ff9933]/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 size-32 rounded-full bg-[#31a76c]/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark className="size-11" />
            <div>
              <p className="text-[16px] font-black leading-none tracking-[0.02em] text-white">NETHAJI BOYS</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.42em] text-[#ffbe7a]">Mandram</p>
              <p className="mt-1.5 text-[12.5px] font-semibold text-white/90">நேதாஜி பாய்ஸ் மன்றம்</p>
            </div>
          </div>
          <div className="text-right">
            <p className="rounded-full bg-[#ff9933] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#101f42]">
              Receipt · ரசீது
            </p>
            <p className="mt-2 font-mono text-[12px] font-bold tracking-wide text-white/90">{collection.receiptNumber}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        {/* event line */}
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#dfe3ec] pb-3">
          <p className="min-w-0 truncate text-[13px] font-bold text-[#101f42]">{eventLabel}</p>
          <span className="shrink-0 rounded-full bg-[#ff9933]/15 px-2.5 py-0.5 text-[10.5px] font-bold text-[#b06a1a]">
            {collection.category || collection.street || "ஊர் வசூல்"}
          </span>
        </div>

        {/* donor */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8e98af]">Received from · பெற்றுக்கொண்டவர்</p>
            <p className="mt-1 truncate text-[16px] font-extrabold text-[#141d33]">{collection.personName}</p>
            <p className="mt-0.5 text-[11.5px] font-medium text-[#5f6c88]">
              {collection.street && collection.street !== collection.category
                ? `${collection.street} · `
                : ""}
              {collection.phone ? `+91 ${collection.phone}` : (collection.street && collection.street !== collection.category ? "" : "—")}
            </p>
          </div>
        </div>

        {/* amount */}
        <div className="flex items-end justify-between gap-4 rounded-xl border border-[#ff9933]/45 bg-[#fff8ee] px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b06a1a]">Amount · தொகை</p>
            <p className="mt-0.5 text-[26px] font-black leading-none tracking-tight tabular-nums text-[#141d33]">
              {formatINR(collection.amount)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#141d33]">
            <method.icon className="size-4 text-[#b06a1a]" />
            {method.label}
          </div>
        </div>
        <p className="text-[11px] font-semibold italic leading-relaxed text-[#5f6c88]">
          Rupees {rupeesInWords(collection.amount)} only
        </p>

        {/* meta grid */}
        <div className="grid grid-cols-2 gap-3 text-[11.5px]">
          <div>
            <p className="font-bold uppercase tracking-wide text-[#8e98af]">Date · தேதி</p>
            <p className="mt-0.5 font-bold text-[#141d33]">{formatLong(collection.date)}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wide text-[#8e98af]">Receipt No · எண்</p>
            <p className="mt-0.5 font-mono font-bold text-[#141d33]">{collection.receiptNumber}</p>
          </div>
        </div>

        {collection.notes ? (
          <div className="rounded-lg bg-[#f2f4fa] px-3 py-2 text-[11.5px] font-medium text-[#5f6c88]">{collection.notes}</div>
        ) : null}

        {/* sign strip */}
        <div className="flex items-end justify-between gap-4 border-t border-dashed border-[#dfe3ec] pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e98af]">Received by</p>
            <p className="mt-0.5 text-[12px] font-bold text-[#141d33]">{collection.createdBy}</p>
          </div>
          <div className="text-right">
            <div className="mb-1 h-8 w-28 rounded border-b border-[#9aa4ba]" />
            <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8e98af]">Secretary / Treasurer</p>
          </div>
        </div>

        <p className="text-center text-[10.5px] font-semibold tracking-wide text-[#5f6c88]">
          🙏 Thank you for your contribution · தானத்திற்கு நன்றி
        </p>
      </div>
    </div>
  );
}
