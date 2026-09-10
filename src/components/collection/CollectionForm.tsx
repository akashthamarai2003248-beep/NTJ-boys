"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CalendarDays, ReceiptText, Undo2, UserRound } from "lucide-react";
import type { Collection, CollectionInput, Event, PaymentMethod } from "@/lib/data/types";
import { PAYMENT_CHOICES, PAYMENT_METHODS } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayISO } from "@/lib/utils/date";
import { parseRupees, formatINR } from "@/lib/utils/money";
import { parseVoiceTranscript } from "@/lib/utils/voice";
import { VoiceToText } from "@/components/shared/VoiceToText";
import { cn } from "@/lib/utils/cn";

/** Field values just before voice dictation, so Undo can restore them. */
interface VoiceSnapshot {
  personName: string;
  amount: string;
  paymentMethod: PaymentMethod;
  eventId: string;
  phone: string;
  street: string;
}

interface Props {
  events: Event[];
  initial?: Collection | null;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: CollectionInput) => void;
  onCancel: () => void;
}

export function CollectionForm({ events, initial, submitting, error, onSubmit, onCancel }: Props) {
  const [personName, setPersonName] = useState(initial?.personName ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "cash");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [eventId, setEventId] = useState(initial?.eventId ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceSnapshot, setVoiceSnapshot] = useState<VoiceSnapshot | null>(null);
  // phone / street have no dedicated input — captured from dictation only
  const [dictatedPhone, setDictatedPhone] = useState("");
  const [dictatedStreet, setDictatedStreet] = useState("");

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const parsed = parseVoiceTranscript(text, events);
      setVoiceSnapshot({ personName, amount, paymentMethod, eventId, phone: dictatedPhone, street: dictatedStreet });
      setVoiceTranscript(text);
      if (parsed.name) setPersonName(parsed.name);
      if (parsed.amount && parsed.amount > 0) setAmount(String(parsed.amount));
      if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
      if (parsed.eventId !== undefined) setEventId(parsed.eventId ?? "");
      if (parsed.phone) setDictatedPhone(parsed.phone);
      if (parsed.street) setDictatedStreet(parsed.street);
    },
    [events, personName, amount, paymentMethod, eventId, dictatedPhone, dictatedStreet],
  );

  const undoVoice = () => {
    if (!voiceSnapshot) return;
    setPersonName(voiceSnapshot.personName);
    setAmount(voiceSnapshot.amount);
    setPaymentMethod(voiceSnapshot.paymentMethod);
    setEventId(voiceSnapshot.eventId);
    setDictatedPhone(voiceSnapshot.phone);
    setDictatedStreet(voiceSnapshot.street);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rupees = parseRupees(amount);
    if (!personName.trim()) return setLocalError("Please enter the contributor's name");
    if (!rupees || rupees <= 0) return setLocalError("Amount must be a positive number");
    if (!date) return setLocalError("Please choose a date");
    setLocalError(null);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
    onSubmit({
      personName: personName.trim(),
      // hidden fields keep their stored values when editing, so they aren't wiped;
      // otherwise they fall back to what the voice dictation captured
      phone: initial?.phone ?? (dictatedPhone || undefined),
      street: initial?.street ?? (dictatedStreet || undefined),
      amount: rupees,
      paymentMethod,
      contributionType: initial?.contributionType ?? "namePhone",
      date,
      eventId: eventId || null,
      notes: initial?.notes ?? undefined,
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
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-saffron-600 dark:text-saffron-400">
        Contributor details · நன்கொடையாளர்
      </p>

      <VoiceToText
        onTranscript={handleVoiceTranscript}
        example="Listening… say the name, payment and amount, e.g. “Ravi Kumar, cash, 750”."
        exampleTa="கேட்கிறது… பெயர், கட்டண முறை, தொகையைச் சொல்லுங்கள், எ.கா. “ரவி குமார், ரொக்கம், 750”."
        prompt="Dictate the contribution — the name field fills itself."
        promptTa="பங்களிப்பைப் பேசுங்கள் — பெயர் புலம் தானாக நிரம்பும்."
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
        <Field label="Person name" ta="பெயர்" required className="sm:col-span-2">
          <Input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. Ravi Kumar"
            leading={<UserRound className="size-4" />}
          />
        </Field>
        <Field label="Amount" ta="தொகை" required hint={live && live > 0 ? formatINR(live) : undefined}>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            inputMode="numeric"
            className="tabular-nums"
            leading={<span className="text-sm font-bold">₹</span>}
          />
        </Field>
        <Field label="Payment method" ta="கட்டண முறை" required>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            {methodOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} · {m.ta}
              </option>
            ))}
          </Select>
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
            <option value="">General fund · பொது நிதி</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
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
        <Button type="submit" variant="primary" loading={submitting} className={cn(submitting ? "opacity-90" : "")}>
          <ReceiptText className="size-4" />
          {initial ? "Save changes" : "Add Collection"}
        </Button>
      </div>
    </form>
  );
}