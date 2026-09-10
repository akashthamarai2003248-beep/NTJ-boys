"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/data/types";
import { formatINR } from "@/lib/utils/money";
import { formatLong } from "@/lib/utils/date";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PaymentLabel, categoryTone } from "@/components/shared/meta";

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
  if (!expense) return null;
  return (
    <Modal open={open} onClose={onClose} title="Expense details" description="செலவு விவரங்கள் · view the full record" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold leading-snug">{expense.title}</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">{expense.paidBy} · paid on {formatLong(expense.date)}</p>
          </div>
          <Badge tone={categoryTone(expense.category)}>{expense.category}</Badge>
        </div>

        <p className="text-[26px] font-black leading-none tracking-tight tabular-nums text-red-600 dark:text-red-400">
          − {formatINR(expense.amount)}
        </p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-surface-2 p-4 text-[13px]">
          <Info label="Event · நிகழ்வு" value={eventName ?? "General · பொது"} />
          <Info label="Payment · கட்டணம்" value={<PaymentLabel method={expense.paymentMethod} />} />
          <Info label="Category · வகை" value={expense.category} />
          <Info label="Recorded by" value={expense.createdBy} />
          <Info label="Created" value={new Date(expense.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
          <Info label="Last updated" value={new Date(expense.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
        </dl>

        {expense.description ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Notes · குறிப்புகள்</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{expense.description}</p>
          </div>
        ) : null}

        {expense.billUrl ? (
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Bill photo · ரசீது</p>
            <a href={expense.billUrl} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={expense.billUrl} alt="Bill" className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
              <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg bg-navy-950/75 px-2.5 py-1.5 text-[11.5px] font-bold text-white backdrop-blur">
                <Eye className="size-3.5" /> View full bill
              </span>
            </a>
          </div>
        ) : null}

        {writable && (
          <div className="flex gap-2.5 border-t border-line pt-4">
            <Button variant="secondary" className="flex-1" onClick={onEdit}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="danger" className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={onDelete}>
              <Trash2 className="size-4" /> Delete
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
