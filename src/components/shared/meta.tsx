"use client";

import { Banknote, Landmark, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import {
  EVENT_TYPES, EXPENSE_CATEGORIES, PAYMENT_METHODS,
  type EventStatus, type EventType, type PaymentMethod,
} from "@/lib/data/types";
import { EVENT_STATUSES } from "@/lib/data/types";
import { Badge, type BadgeTone } from "./tone";

export { EVENT_TYPES, EXPENSE_CATEGORIES, PAYMENT_METHODS };

export const paymentMeta: Record<PaymentMethod, { label: string; ta: string; icon: LucideIcon }> = {
  cash: { label: "Cash", ta: "ரொக்கம்", icon: Banknote },
  upi: { label: "GPay (UPI)", ta: "ஜிபே (யுபிஐ)", icon: Smartphone },
  bank: { label: "Bank Transfer", ta: "வங்கி", icon: Landmark },
  other: { label: "Other", ta: "மற்றவை", icon: Wallet },
};

export function PaymentLabel({ method }: { method: PaymentMethod }) {
  const m = paymentMeta[method];
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink">
      <m.icon className="size-3.5 text-faint" />
      <span>{m.label}</span>
    </span>
  );
}

export function eventTypeMeta(type: EventType) {
  return EVENT_TYPES.find((e) => e.value === type) ?? EVENT_TYPES[4];
}

export function EventStatusPill({ status }: { status: EventStatus }) {
  const s = EVENT_STATUSES.find((x) => x.value === status) ?? EVENT_STATUSES[2];
  return <Badge tone={s.tone as BadgeTone}>{s.label}</Badge>;
}

const catTones: BadgeTone[] = ["saffron", "leaf", "navy", "gold", "red", "violet", "muted"];
export function categoryTone(cat: string): BadgeTone {
  return catTones[EXPENSE_CATEGORIES.indexOf(cat as (typeof EXPENSE_CATEGORIES)[number]) % catTones.length] ?? "muted";
}
