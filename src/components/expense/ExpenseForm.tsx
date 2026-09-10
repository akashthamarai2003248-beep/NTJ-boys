"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays, ImagePlus, ReceiptText, Tag, Undo2, UserRound, X,
} from "lucide-react";
import type { Event, Expense, ExpenseCategory, ExpenseInput, PaymentMethod } from "@/lib/data/types";
import { EXPENSE_CATEGORIES, PAYMENT_CHOICES, PAYMENT_METHODS } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO } from "@/lib/utils/date";
import { parseRupees, formatINR } from "@/lib/utils/money";
import { parseVoiceExpenseTranscript } from "@/lib/utils/voice";
import { VoiceToText } from "@/components/shared/VoiceToText";

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

const MAX_BILL = 2.5 * 1024 * 1024;

export function ExpenseForm({ events, initial, submitting, error, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "Decoration");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [eventId, setEventId] = useState(initial?.eventId ?? "");
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "cash");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [billUrl, setBillUrl] = useState<string | null>(initial?.billUrl ?? null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceSnapshot, setVoiceSnapshot] = useState<VoiceSnapshot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      // paid-by and category are intentionally NOT voice-filled —
      // dictation targets only title, amount, date, method and event
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

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLocalError("Please attach an image of the bill");
    if (file.size > MAX_BILL) return setLocalError("Bill image is too large (max 2.5 MB)");
    const reader = new FileReader();
    reader.onload = () => setBillUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rupees = parseRupees(amount);
    if (!title.trim()) return setLocalError("Expense title is required");
    if (!paidBy.trim()) return setLocalError("Please enter who paid");
    if (!rupees || rupees <= 0) return setLocalError("Amount must be a positive number");
    if (!date) return setLocalError("Please choose a date");
    setLocalError(null);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
    onSubmit({
      title: title.trim(),
      category,
      amount: rupees,
      paymentMethod: method,
      date,
      eventId: eventId || null,
      paidBy: paidBy.trim(),
      description: description.trim() || undefined,
      billUrl,
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
        <Field label="Category" ta="வகை" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
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
        <Field label="Paid by" ta="செலுத்தியவர்" required>
          <Input
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            placeholder="e.g. Muthu Kannan"
            leading={<UserRound className="size-4" />}
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
        <Field label="Description" ta="விளக்கம்" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional details about this expense…"
          />
        </Field>

        {/* bill photo */}
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[13px] font-semibold text-ink">
            Bill / receipt photo <span className="ml-1 font-medium text-faint">ரசீது புகைப்படம்</span>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          {billUrl ? (
            <div className="relative w-fit overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={billUrl} alt="Bill preview" className="h-24 w-40 object-cover" />
              <button
                type="button"
                onClick={() => setBillUrl(null)}
                aria-label="Remove bill photo"
                className="absolute right-1.5 top-1.5 rounded-md bg-navy-950/70 p-1 text-white backdrop-blur transition-colors hover:bg-red-600"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2/60 px-4 py-5 text-[13px] font-semibold text-muted transition-colors hover:border-navy-400 hover:text-navy-700 dark:hover:text-navy-200"
            >
              <ImagePlus className="size-4.5" /> Upload bill photo (optional)
            </button>
          )}
        </div>
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
