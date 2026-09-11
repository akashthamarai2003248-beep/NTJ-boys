"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CalendarDays, ReceiptText, Undo2, UserRound } from "lucide-react";
import type { Collection, CollectionInput, Event, PaymentMethod } from "@/lib/data/types";
import { COLLECTION_CATEGORIES, PAYMENT_CHOICES, PAYMENT_METHODS } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayISO } from "@/lib/utils/date";
import { parseRupees, formatINR } from "@/lib/utils/money";
import { parseVoiceTranscript } from "@/lib/utils/voice";
import { VoiceToText } from "@/components/shared/VoiceToText";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";

/** Field values just before voice dictation, so Undo can restore them. */
interface VoiceSnapshot {
  personName: string;
  amount: string;
  paymentMethod: PaymentMethod;
  eventId: string;
  phone: string;
  street: string;
  category: string;
}

interface Props {
  events: Event[];
  initial?: Collection | null;
  defaultEventId?: string;
  defaultYear?: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: CollectionInput) => void;
  onCancel: () => void;
}

export function CollectionForm({ events, initial, defaultEventId, defaultYear, submitting, error, onSubmit, onCancel }: Props) {
  const { t } = useLang();
  const [personName, setPersonName] = useState(initial?.personName ?? "");
  const [category, setCategory] = useState<string>(initial?.category || initial?.street || "ஊர் வசூல்");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "cash");
  const [date, setDate] = useState(initial?.date ?? (defaultYear && /^\d{4}$/.test(defaultYear) ? `${defaultYear}${todayISO().slice(4)}` : todayISO()));
  const [eventId, setEventId] = useState(initial?.eventId ?? defaultEventId ?? events[0]?.id ?? "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceSnapshot, setVoiceSnapshot] = useState<VoiceSnapshot | null>(null);
  // phone / street captured from dictation or kept from initial
  const [dictatedPhone, setDictatedPhone] = useState("");
  const [dictatedStreet, setDictatedStreet] = useState("");

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      const parsed = parseVoiceTranscript(text, events);
      setVoiceSnapshot({ personName, amount, paymentMethod, eventId, phone: dictatedPhone, street: dictatedStreet, category });
      setVoiceTranscript(text);
      if (parsed.name) setPersonName(parsed.name);
      if (parsed.amount && parsed.amount > 0) setAmount(String(parsed.amount));
      if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
      if (parsed.eventId !== undefined) setEventId(parsed.eventId ?? "");
      if (parsed.phone) setDictatedPhone(parsed.phone);
      if (parsed.street) setDictatedStreet(parsed.street);
      if (/ஊர்|oor|village/i.test(text)) setCategory("ஊர் வசூல்");
      else if (/மன்றம்|mandram|member/i.test(text)) setCategory("மன்றம் வசூல்");
    },
    [events, personName, amount, paymentMethod, eventId, dictatedPhone, dictatedStreet, category],
  );

  const undoVoice = () => {
    if (!voiceSnapshot) return;
    setPersonName(voiceSnapshot.personName);
    setAmount(voiceSnapshot.amount);
    setPaymentMethod(voiceSnapshot.paymentMethod);
    setEventId(voiceSnapshot.eventId);
    setDictatedPhone(voiceSnapshot.phone);
    setDictatedStreet(voiceSnapshot.street);
    setCategory(voiceSnapshot.category);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rupees = parseRupees(amount);
    const selectedEventId = eventId || events[0]?.id || "";
    if (!selectedEventId) return setLocalError("Please choose an event");
    if (!personName.trim()) return setLocalError(t("Please enter the contributor's name", "நன்கொடையாளர் பெயரை உள்ளிடவும்"));
    if (!rupees || rupees <= 0) return setLocalError(t("Amount must be a positive number", "தொகை சரியான எண்ணாக இருக்க வேண்டும்"));
    if (!date) return setLocalError(t("Please choose a date", "தேதியைத் தேர்ந்தெடுக்கவும்"));
    setLocalError(null);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
    onSubmit({
      personName: personName.trim(),
      phone: initial?.phone ?? (dictatedPhone || undefined),
      street: category,
      category,
      amount: rupees,
      paymentMethod,
      contributionType: initial?.contributionType ?? "namePhone",
      date,
      eventId: selectedEventId,
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
    <form onSubmit={submit} className="space-y-4 sm:space-y-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-saffron-600 dark:text-saffron-400">
        {t("Contributor details", "நன்கொடையாளர் விவரங்கள்")}
      </p>

      <VoiceToText
        onTranscript={handleVoiceTranscript}
        example="Listening… say the name, category, payment and amount, e.g. “Ravi Kumar, Oor Vasul, cash, 500”."
        exampleTa="கேட்கிறது… பெயர், வசூல் வகை, கட்டண முறை, தொகையைச் சொல்லுங்கள்."
        prompt="Dictate the contribution — the name and details fill themselves."
        promptTa="பங்களிப்பைப் பேசுங்கள் — விவரங்கள் தானாக நிரம்பும்."
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

      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
        {/* Category selector */}
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-[12.5px] font-bold text-ink">
            {t("Category", "வசூல் வகை")} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COLLECTION_CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                    active
                      ? "border-saffron-500 bg-saffron-50/80 text-saffron-950 shadow-sm dark:border-saffron-500 dark:bg-saffron-500/15 dark:text-saffron-300"
                      : "border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-ink"
                  )}
                >
                  <span className="text-[13px] font-extrabold">{t(cat.sub, cat.label)}</span>
                  <span className={cn("text-[10px] font-medium", active ? "text-saffron-700 dark:text-saffron-400" : "text-faint")}>
                    {t(cat.label, cat.sub)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Person name" ta="பெயர்" required className="sm:col-span-2">
          <Input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder={t("e.g. Ravi Kumar", "எ.கா. ரவி குமார்")}
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
                {t(m.label, m.ta)}
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
          <Select value={eventId || events[0]?.id || ""} onChange={(e) => setEventId(e.target.value)}>
            {events.length === 0 ? (
            <option value="">{t("General fund", "பொது நிதி")}</option>
            ) : null}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {t(ev.name, ev.tamilName)}
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
          {t("Cancel", "ரத்து செய்")}
        </Button>
        <Button type="submit" variant="primary" loading={submitting} className={cn(submitting ? "opacity-90" : "")}>
          <ReceiptText className="size-4" />
          {initial ? t("Save changes", "மாற்றங்களைச் சேமி") : t("Add Collection", "வரவு சேர்க்க")}
        </Button>
      </div>
    </form>
  );
}
