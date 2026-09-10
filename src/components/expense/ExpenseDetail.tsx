"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/data/types";
import { formatINR } from "@/lib/utils/money";
import { formatLong } from "@/lib/utils/date";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PaymentLabel } from "@/components/shared/meta";

import { useLang } from "@/lib/i18n";
import { translateExpenseTitle, translatePersonName } from "@/lib/utils/translateData";

export function ExpenseDetail({
  expense,
  eventName,
  open,
  onClose,
  onEdit,
  onDelete,
  writable,
}: {
  expense: Expense | null;
  eventName?: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  writable: boolean;
}) {
  const { t, lang } = useLang();
  if (!expense) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Expense details", "செலவு விவரங்கள்")}
      description={t("View the full record", "முழு விவரங்களைப் பார்க்கவும்")}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold leading-snug">{translateExpenseTitle(expense.title, lang)}</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {lang === "ta" ? `செலுத்தப்பட்ட தேதி: ${formatLong(expense.date)}` : `Paid on ${formatLong(expense.date)}`}
            </p>
          </div>
        </div>

        <p className="text-[26px] font-black leading-none tracking-tight tabular-nums text-red-600 dark:text-red-400">
          − {formatINR(expense.amount)}
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-surface-2 p-4 text-[13px]">
          <Info label={t("Event", "நிகழ்வு")} value={eventName ?? (lang === "ta" ? "பொது நிதி" : "General")} />
          <Info label={t("Payment", "கட்டணம்")} value={<PaymentLabel method={expense.paymentMethod} />} />
          <Info label={t("Recorded by", "பதிவு செய்தவர்")} value={translatePersonName(expense.createdBy ?? "", lang)} />
          <Info label={t("Created", "உருவாக்கப்பட்டது")} value={new Date(expense.createdAt).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric" })} />
          <Info label={t("Last updated", "கடைசியாக புதுப்பிக்கப்பட்டது")} value={new Date(expense.updatedAt).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric" })} />
        </dl>

        {writable && (
          <div className="flex gap-2.5 border-t border-line pt-4">
            <Button variant="secondary" className="flex-1" onClick={onEdit}>
              <Pencil className="size-4" /> {t("Edit", "திருத்து")}
            </Button>
            <Button variant="danger" className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={onDelete}>
              <Trash2 className="size-4" /> {t("Delete", "நீக்கு")}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] font-bold uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
