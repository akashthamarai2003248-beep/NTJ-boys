"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  CalendarDays, Camera, ImagePlus, Link2, Loader2, MapPin, Type, X,
} from "lucide-react";
import type { Event, EventInput, EventStatus, EventType } from "@/lib/data/types";
import { EVENT_STATUSES, EVENT_TYPES } from "@/lib/data/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayISO, resolveEventStatus } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { uploadImage } from "@/lib/client/upload";

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
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(initial?.endDate ?? todayISO());
  const [status, setStatus] = useState<EventStatus>(() => {
    if (initial?.status) return initial.status;
    const defaultStart = initial?.startDate ?? todayISO();
    const defaultEnd = initial?.endDate ?? todayISO();
    return resolveEventStatus("upcoming", defaultStart, defaultEnd);
  });
  const [location, setLocation] = useState(initial?.location ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cover, setCover] = useState<string | null>(initial?.cover ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
    if (!initial) {
      if (val <= todayISO()) {
        setStatus("active");
      } else {
        setStatus("upcoming");
      }
    }
  };

  const meta = EVENT_TYPES.find((t) => t.value === type);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return setLocalError("Please choose an image file (PNG, JPG, WEBP)");
    }
    setLocalError(null);
    setUploadingCover(true);
    setUploadInfo("Compressing to <400KB & uploading…");
    try {
      const result = await uploadImage(file, "events");
      setCover(result.url);
      setUploadInfo(`Compressed (${result.formattedSize}) · ${result.storage === "supabase" ? "Supabase Storage" : "Ready"}`);
    } catch (err) {
      setLocalError((err as Error).message || "Could not process cover image");
    } finally {
      setUploadingCover(false);
    }
  };

  const applyUrl = () => {
    if (!urlInput.trim()) return;
    setCover(urlInput.trim());
    setUrlInput("");
    setUploadInfo(null);
    setLocalError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setLocalError("Event name is required");
    if (!startDate) return setLocalError("Start date is required");
    if (endDate < startDate) return setLocalError("End date must be on or after the start date");
    setLocalError(null);
    const resolvedStatus = resolveEventStatus(status, startDate, endDate);
    onSubmit({
      name: name.trim(),
      tamilName: tamilName.trim(),
      type,
      status: resolvedStatus,
      startDate,
      endDate,
      location: location.trim(),
      description: description.trim(),
      cover: cover?.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 sm:space-y-5">
      {/* Event Photo / Cover Section */}
      <div>
        <label className="mb-1.5 block text-[12.5px] font-bold text-ink">
          Event photo / banner <span className="font-medium text-faint">நிகழ்வு புகைப்படம்</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />

        {cover ? (
          <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="Event cover preview" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="rounded-lg bg-navy-950/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                ✓ Photo attached
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-[12px] font-bold text-navy-950 shadow-sm backdrop-blur transition-colors hover:bg-white"
                >
                  <Camera className="size-3.5" /> Change
                </button>
                <button
                  type="button"
                  onClick={() => setCover(null)}
                  className="flex items-center gap-1 rounded-lg bg-red-600/90 px-2.5 py-1.5 text-[12px] font-bold text-white shadow-sm backdrop-blur transition-colors hover:bg-red-600"
                >
                  <X className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1 rounded-xl bg-surface-2/70 p-1">
              <button
                type="button"
                onClick={() => setPhotoMode("file")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-center text-[12px] font-bold transition-all",
                  photoMode === "file" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                Upload from device
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode("url")}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-center text-[12px] font-bold transition-all",
                  photoMode === "url" ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                Paste photo URL
              </button>
            </div>

            {photoMode === "file" ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingCover}
                className="group flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2/50 p-4 text-center transition-all hover:border-saffron-500 hover:bg-saffron-50/40 disabled:opacity-60 dark:hover:bg-saffron-500/5"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-saffron-100 text-saffron-600 transition-transform group-hover:scale-110 dark:bg-saffron-500/15 dark:text-saffron-400">
                  {uploadingCover ? (
                    <Loader2 className="size-5 animate-spin text-saffron-600 dark:text-saffron-400" />
                  ) : (
                    <ImagePlus className="size-5" />
                  )}
                </span>
                <div>
                  <p className="text-[13px] font-bold text-ink group-hover:text-saffron-600 dark:group-hover:text-saffron-400">
                    {uploadingCover ? "Compressing & uploading to Supabase Storage…" : "Upload event photo · படம் பதிவேற்றவும்"}
                  </p>
                  <p className="text-[11px] text-faint">
                    Auto-compressed to &le;400 KB · Stored on Supabase Storage
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/event-banner.jpg"
                  leading={<Link2 className="size-4" />}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={applyUrl} disabled={!urlInput.trim()}>
                  Attach
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 sm:gap-4">
        <Field label="Event name" ta="பெயர்" required className="sm:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vinayagar Chathurthi 2026"
            leading={<Type className="size-4" />}
          />
        </Field>
        <Field label="Tamil name" ta="தமிழ் பெயர்" className="sm:col-span-2">
          <Input
            value={tamilName}
            onChange={(e) => setTamilName(e.target.value)}
            placeholder="e.g. விநாயகர் சதுர்த்தி விழா 2026"
          />
        </Field>
        <Field label="Event type" ta="வகை" required>
          <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.emoji} {t.label} · {t.ta}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status" ta="நிலை" required>
          <Select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
            {EVENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label} · {s.ta}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start date" ta="தொடக்கம்" required>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            leading={<CalendarDays className="size-4" />}
          />
        </Field>
        <Field label="End date" ta="முடிவு" required>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            leading={<CalendarDays className="size-4" />}
          />
        </Field>
        <Field label="Location" ta="இடம்" className="sm:col-span-2">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Temple Arch, North Street"
            leading={<MapPin className="size-4" />}
          />
        </Field>
        <Field label="Description" ta="விளக்கம்" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional notes or details about this event…"
          />
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
          {initial ? "Save changes" : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
