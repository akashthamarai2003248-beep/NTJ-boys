"use client";

import { createPortal } from "react-dom";
import { Pencil, Printer, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Collection, Event } from "@/lib/data/types";
import { useFetch } from "@/lib/client/hooks";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils/money";
import { formatLong } from "@/lib/utils/date";
import { useLang } from "@/lib/i18n";
import { ReceiptSheet } from "./ReceiptSheet";

export function ReceiptDialog({
  collection,
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  collection: Collection | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (c: Collection) => void;
  onDelete?: (c: Collection) => void;
}) {
  const { t } = useLang();
  const { data } = useFetch<{ events: Event[] }>(open ? "/api/events" : null);
  const event = collection ? (data?.events.find((e) => e.id === collection.eventId) ?? null) : null;

  if (!collection) return null;

  const share = async () => {
    const line = `Nethaji Boys Mandram · நேதாஜி பாய்ஸ் மன்றம்`;
    const text =
      `${line}\nReceipt ${collection.receiptNumber}\n` +
      `${formatINR(collection.amount)} received from ${collection.personName}\n` +
      `${event ? event.name : "General Fund"} · ${formatLong(collection.date)} · ${collection.paymentMethod.toUpperCase()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Receipt ${collection.receiptNumber}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Receipt details copied — paste to share");
    } catch {
      /* cancelled share sheet */
    }
  };

  const print = () => {
    // the .print-sheet copy lives at body level — render, then print
    window.setTimeout(() => window.print(), 60);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t("Receipt", "ரசீது")}
        description={`${collection.receiptNumber} · ${formatShortPrint(collection.date)}`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <ReceiptSheet collection={collection} event={event} />
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button variant="secondary" onClick={() => void share()}>
              <Share2 className="size-4" /> {t("Share receipt", "ரசீது பகிரவும்")}
            </Button>
            <Button variant="primary" onClick={print}>
              <Printer className="size-4" /> {t("Print / Save PDF", "அச்சிடு / PDF சேமி")}
            </Button>
            {onEdit && (
              <Button
                variant="secondary"
                onClick={() => {
                  onClose();
                  onEdit(collection);
                }}
              >
                <Pencil className="size-4" /> {t("Edit", "திருத்து")}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                className="text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                onClick={() => {
                  onClose();
                  onDelete(collection);
                }}
              >
                <Trash2 className="size-4" /> {t("Delete", "நீக்கு")}
              </Button>
            )}
          </div>
          <p className="text-center text-[11px] font-medium text-faint">
            {t(
              "Printing uses the clean receipt layout — choose “Save as PDF” as the printer to download it.",
              "அச்சிடுதல் சுத்தமான ரசீது அமைப்பைப் பயன்படுத்துகிறது — பதிவிறக்க “Save as PDF” என்பதைத் தேர்ந்தெடுக்கவும்."
            )}
          </p>
        </div>
      </Modal>

      {typeof document !== "undefined"
        ? createPortal(
            <div className="print-sheet" aria-hidden>
              <ReceiptSheet collection={collection} event={event} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function formatShortPrint(iso: string): string {
  return formatLong(iso);
}
