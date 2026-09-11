"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  CalendarDays, Camera, Loader2, ReceiptText, Tag, Undo2, X,
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
import { uploadImage } from "@/lib/client/upload";
import { useLang } from "@/lib/i18n";

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
  defaultEventId?: string;
  defaultYear?: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

export function ExpenseForm({ events, initial, defaultEventId, defaultYear, submitting, error, onSubmit, onCancel }: Props) {
  const { user } = useSession();
  const { lang, t } = useLang();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [eventId, setEventId] = useState(initial?.eventId ?? defaultEventId ?? events[0]?.id ?? "");
  const [date, setDate] = useState(initial?.date ?? (defaultYear && /^\d{4}$/.test(defaultYear) ? `${defaultYear}${todayISO().slice(4)}` : todayISO()));
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "cash");
  const [billUrl, setBillUrl] = useState<string | null>(initial?.billUrl ?? null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [billInfo, setBillInfo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const billFileRef = useRef<HTMLInputElement>(null);
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

  const onPickBill = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return setLocalError(t("Please choose an image file (PNG, JPG, WEBP)", "தயவுசெய்து படக் கோப்பைத் தேர்ந்தெடுக்கவும் (PNG, JPG, WEBP)"));
    }
    setLocalError(null);
    setUploadingBill(true);
    setBillInfo(t("Compressing to <400KB & uploading…", "400KB-க்குள் சுருக்கி பதிவேற்றப்படுகிறது…"));
    try {
      const result = await uploadImage(file, "expenses");
      setBillUrl(result.url);
      setBillInfo(
        `${t("Compressed", "சுருக்கப்பட்டது")} (${result.formattedSize}) · ${
          result.storage === "supabase" ? t("Supabase Storage", "சுபாபேஸ் சேமிப்பகம்") : t("Ready", "தயார்")
        }`
      );
    } catch (err) {
      setLocalError((err as Error).message || t("Could not process bill image", "ரசீது படத்தை செயலாக்க முடியவில்லை"));
    } finally {
      setUploadingBill(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const rupees = parseRupees(amount);
    const selectedEventId = eventId || events[0]?.id || "";
    if (!selectedEventId) return setLocalError("Please choose an event");
    if (!title.trim()) return setLocalError(t("Expense title is required", "செலவின் தலைப்பு தேவை"));
    if (!rupees || rupees <= 0) return setLocalError(t("Amount must be a positive number", "தொகை நேர்மறை எண்ணாக இருக்க வேண்டும்"));
    if (!date) return setLocalError(t("Please choose a date", "தயவுசெய்து தேதியைத் தேர்ந்தெடுக்கவும்"));
    setLocalError(null);
    setVoiceTranscript(null);
    setVoiceSnapshot(null);
    onSubmit({
      title: title.trim(),
      category: initial?.category ?? "Other",
      amount: rupees,
      paymentMethod: method,
      date,
      eventId: selectedEventId,
      paidBy: initial?.paidBy || user?.name || "Mandram",
      description: initial?.description ?? undefined,
      billUrl: billUrl ?? null,
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
        {lang === "ta" ? "செலவு விவரங்கள்" : lang === "en" ? "Expense details" : "Expense details · செலவு விவரங்கள்"}
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
            <p className="text-[12.5px] font-bold text-leaf-700 dark:text-leaf-400">
              {lang === "ta" ? "குரல் பதிவு" : lang === "en" ? "Voice captured" : "Voice captured · குரல் பதிவு"}
            </p>
            <p className="mt-0.5 truncate text-[12px] italic text-muted">“{voiceTranscript}”</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={undoVoice}>
            <Undo2 className="size-3.5" /> {t("Undo", "முந்தைய நிலை")}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Expense title" ta="தலைப்பு" required className="sm:col-span-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("e.g. Sound system hire", "எ.கா. ஒலிபெருக்கி அமைப்பு வாடகை")}
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
          <Select value={eventId || events[0]?.id || ""} onChange={(e) => setEventId(e.target.value)}>
            {events.length === 0 ? (
            <option value="">{t("General fund", "பொது நிதி")}</option>
            ) : null}
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {lang === "ta" ? (ev.tamilName || ev.name) : lang === "en" ? ev.name : `${ev.name}${ev.tamilName ? ` · ${ev.tamilName}` : ""}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment method" ta="கட்டண முறை">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {methodOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {lang === "ta" ? m.ta : lang === "en" ? m.label : `${m.label} · ${m.ta}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-ink">
          {lang === "ta" ? "ரசீது புகைப்படம்" : lang === "en" ? "Bill / Receipt photo" : "Bill / Receipt photo · ரசீது"}{" "}
          <span className="font-medium text-faint">({t("optional", "விருப்பத்தேர்வு")})</span>
        </label>
        <input
          ref={billFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickBill(e.target.files?.[0])}
        />
        {billUrl ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={billUrl} alt="Bill preview" className="size-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-ink">{t("✓ Bill attached", "✓ ரசீது இணைக்கப்பட்டது")}</p>
              {billInfo && <p className="text-[11px] font-semibold text-leaf-600 dark:text-leaf-400">{billInfo}</p>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setBillUrl(null); setBillInfo(null); }}
              className="text-red-500 hover:text-red-600"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => billFileRef.current?.click()}
            disabled={uploadingBill}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2/40 py-2.5 text-[12.5px] font-bold text-muted transition-colors hover:border-saffron-400 hover:text-ink disabled:opacity-60"
          >
            {uploadingBill ? (
              <>
                <Loader2 className="size-4 animate-spin text-saffron-600" />
                <span>{t("Compressing to ≤400 KB & uploading…", "400 KB-க்குள் சுருக்கி பதிவேற்றப்படுகிறது…")}</span>
              </>
            ) : (
              <>
                <Camera className="size-4 text-faint" />
                <span>
                  {t(
                    "Attach bill photo (≤400 KB · Supabase Storage)",
                    "ரசீது புகைப்படம் இணைக்கவும் (≤400 KB · சுபாபேஸ் சேமிப்பகம்)"
                  )}
                </span>
              </>
            )}
          </button>
        )}
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
        <Button type="submit" variant="primary" loading={submitting}>
          <ReceiptText className="size-4" />
          {initial ? t("Save changes", "மாற்றங்களைச் சேமி") : t("Add Expense", "செலவு சேர்க்க")}
        </Button>
      </div>
    </form>
  );
}
