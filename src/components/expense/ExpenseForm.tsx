"use client";

import { useCallback, useState, type FormEvent } from "react";
import {
  CalendarDays, ReceiptText, Tag, Undo2,
} from "lucide-react";
import type { Event, Expense, ExpenseInput, PaymentMethod } from "@/lib/data/types";
import { PAYMENT_CHOICES, PAYMENT_METHODS } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayISO } from "@/lib/utils/date";
import { parseRupees, formatINR } from "@/lib/utils/money";
import { parseVoiceExpenseTranscript } from "@/lib/utils/voice";
import { VoiceToText } from "@/components/shared/VoiceToText";
import { useSession } from "@/components/layout/session";

/** Field values just before voice dictation, so Undo can restore them. */
interface VoiceSnapshot {
  title: string;
  amount: string;
  date: string;
  method: PaymentMethod;
  eventId: string;
}

interface Props {
  events: Event[];
  initial?: Expense | null;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

export function ExpenseForm({ events, initial, submitting, error, onSubmit, onCancel }: Props) {
  const { user } = useSession();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [eventId, setEventId] = useState(initial?.eventId ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "cash");
  const [localError, setLocalError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceSnapshot, setVoiceSnapshot] = useState<VoiceSnapshot | null>(null);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const parsed = parseVoiceExpenseTranscript(text, events);
      setVoiceSnapshot({ title, amount, date, method, eventId });
      setVoiceTranscript(text);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.amount && parsed.amount > 0) setAmount(String(parsed.amount));
      if (parsed.date) setDate(parsed.date);
      if (parsed.paymentMethod) setMethod(parsed.paymentMethod);
      if (parsed.eventId !== undefined) setEventId(parsed.eventId ?? "");
    },
    [events, title, amount, date, method, eventId],
  );

  const undoVoice = () => {
    if (!voiceSnapshot) return;
    setTitle(voiceSnapshot.title);
    setAmount(voiceSnapshot.amount);
    setDate(voiceSnapshot.date);
    setMethod(voiceSnapshot.method);
    setEventId(voiceSnapshot.eventId);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rupees = parseRupees(amount);
    if (!title.trim()) return setLocalError("Expense title is required");
    if (!rupees || rupees <= 0) return setLocalError("Amount must be a positive number");
    if (!date) return setLocalError("Please choose a date");
    setLocalError(null);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
    onSubmit({
      title: title.trim(),
      category: initial?.category ?? "Other",
      amount: rupees,
      paymentMethod: method,
      date,
      eventId: eventId || null,
      paidBy: initial?.paidBy || user?.name || "Mandram",
      description: initial?.description ?? undefined,
      billUrl: initial?.billUrl ?? null,
    });
  };

  const live = parseRupees(amount);
  // legacy bank/other rows keep their value while editing — but no new ones can be picked
  const legacyMethod = initial?.paymentMethod ? PAYMENT_METHODS.find((m) => m.value === initial.paymentMethod) : undefined;
  const methodOptions = legacyMethod && !PAYMENT_CHOICES.some((m) => m.value === legacyMethod.value)
    ? [...PAYMENT_CHOICES, legacyMethod]
    : PAYMENT_CHOICES;

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-navy-700 dark:text-navy-300">
        Expense details · செலவு விவரங்கள்
      </p>
      <VoiceToText
        onTranscript={handleVoiceTranscript}
        example="Listening… say the expense title, e.g. “Sound system hire”."
        exampleTa="கேட்கிறது… செலவின் தலைப்பைச் சொல்லுங்கள், எ.கா. “ஒலிபெருக்கி அமைப்பு”."
        prompt="Dictate the expense — title, amount, date, payment and event fill themselves."
        promptTa="செலவைப் பேசுங்கள் — தலைப்பு, தொகை, தேதி, கட்டணம், நிகழ்வு தானாக நிரம்பும்."
      />

      {voiceTranscript && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-leaf-500/40 bg-leaf-500/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-leaf-700 dark:text-leaf-400">Voice captured · குரல் பதிவு</p>
            <p className="mt-0.5 truncate text-[12px] italic text-muted">“{voiceTranscript}”</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={undoVoice}>
            <Undo2 className="size-3.5" /> Undo
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Expense title" ta="தலைப்பு" required className="sm:col-span-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sound system hire"
            leading={<Tag className="size-4" />}
          />
        </Field>
        <Field label="Amount" ta="தொகை" required hint={live && live > 0 ? formatINR(live) : undefined}>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="750"
            inputMode="numeric"
            className="tabular-nums"
            leading={<span className="text-sm font-bold">₹</span>}
          />
        </Field>
        <Field label="Date" ta="தேதி" required>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            leading={<CalendarDays className="size-4" />}
          />
        </Field>
        <Field label="Event" ta="நிகழ்வு">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">General · பொது</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Payment method" ta="கட்டண முறை">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {methodOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label} · {m.ta}</option>
            ))}
          </Select>
        </Field>
      </div>

      {(localError || error) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {localError ?? error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          <ReceiptText className="size-4" />
          {initial ? "Save changes" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
