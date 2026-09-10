"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, MapPin, Type } from "lucide-react";
import type { Event, EventInput, EventStatus, EventType } from "@/lib/data/types";
import { EVENT_STATUSES, EVENT_TYPES } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO } from "@/lib/utils/date";

interface Props {
  initial?: Event | null;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: EventInput) => void;
  onCancel: () => void;
}

export function EventForm({ initial, submitting, error, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tamilName, setTamilName] = useState(initial?.tamilName ?? "");
  const [type, setType] = useState<EventType>(initial?.type ?? "festival");
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "upcoming");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate ?? todayISO());
  const [location, setLocation] = useState(initial?.location ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const meta = EVENT_TYPES.find((t) => t.value === type);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setLocalError("Event name is required");
    if (!startDate) return setLocalError("Start date is required");
    if (endDate < startDate) return setLocalError("End date must be on or after the start date");
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      tamilName: tamilName.trim(),
      type,
      status,
      startDate,
      endDate,
      location: location.trim(),
      description: description.trim(),
      cover: initial?.cover ?? null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/70 px-4 py-3">
        <span className="text-2xl">{meta?.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold">{name || "Untitled event"}</p>
          <p className="text-[11.5px] font-medium text-faint">
            {meta?.label} · {meta?.ta} · {startDate && endDate ? `${startDate} → ${endDate}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event name" ta="பெயர்" required className="sm:col-span-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vinayagar Chathurthi 2027" leading={<Type className="size-4" />} />
        </Field>
        <Field label="Tamil name" ta="தமிழ் பெயர்" className="sm:col-span-2">
          <Input value={tamilName} onChange={(e) => setTamilName(e.target.value)} placeholder="e.g. விநாயகர் சதுர்த்தி விழா" />
        </Field>
        <Field label="Event type" ta="வகை" required>
          <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label} · {t.ta}</option>)}
          </Select>
        </Field>
        <Field label="Status" ta="நிலை" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
            {EVENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label} · {s.ta}</option>)}
          </Select>
        </Field>
        <Field label="Start date" ta="தொடக்கம்" required>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} leading={<CalendarDays className="size-4" />} />
        </Field>
        <Field label="End date" ta="முடிவு" required>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} leading={<CalendarDays className="size-4" />} />
        </Field>
        <Field label="Location" ta="இடம்" className="sm:col-span-2">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Temple Arch, North Street" leading={<MapPin className="size-4" />} />
        </Field>
        <Field label="Description" ta="விளக்கம்" className="sm:col-span-2">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What makes this event special for the Mandram…" />
        </Field>
      </div>

      {(localError || error) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {localError ?? error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2.5 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" variant="primary" loading={submitting}>
          {initial ? "Save changes" : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
