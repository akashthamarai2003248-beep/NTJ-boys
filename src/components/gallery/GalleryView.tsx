"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImagePlus, Link2, SearchX, Trash2, X } from "lucide-react";
import type { Event, GalleryInput, GalleryPhoto } from "@/lib/data/types";
import { api, qs } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { timeAgo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

interface GalleryPayload { photos: GalleryPhoto[] }
interface EventsPayload { events: Event[] }

export function GalleryView({ eventId: deepLink }: { eventId?: string }) {
  const { can } = usePermissions();
  const admin = can.events;
  const [eventId, setEventId] = useState(deepLink ?? "");
  const { data, loading, reload } = useFetch<GalleryPayload>(`/api/gallery${qs({ eventId })}`);
  const eventsFetch = useFetch<EventsPayload>("/api/events");
  const events = eventsFetch.data?.events ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState<GalleryPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const photos = data?.photos ?? [];
  const eventName = (id?: string | null) => events.find((e) => e.id === id)?.name ?? "General";

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Gallery · புகைப்படங்கள்"
        title="Gallery"
        ta="புகைப்படங்கள் · memories of every celebration"
        subtitle="Festival, sports and community photos from the Mandram"
        actions={admin ? (
          <Button variant="primary" onClick={() => { setFormError(null); setAddOpen(true); }}>
            <ImagePlus className="size-4" /> Add Photo
          </Button>
        ) : undefined}
      />

      {/* event chips */}
      <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={eventId === ""} onClick={() => setEventId("")}>All</Chip>
        {events.map((ev) => (
          <Chip key={ev.id} active={eventId === ev.id} onClick={() => setEventId(ev.id)}>{ev.name}</Chip>
        ))}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="card-surface rounded-2xl">
          <EmptyState
            icon={eventId ? SearchX : Camera}
            title={eventId ? "No photos for this event yet" : "No photos yet"}
            message="Add photos from the festival, Pongal or sports day — memories shared with the whole Mandram."
            action={admin ? (
              <Button variant="primary" onClick={() => { setFormError(null); setAddOpen(true); }}>
                <ImagePlus className="size-4" /> Add Photo
              </Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? "Mandram photo"} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-3 pb-2.5 pt-8 text-left">
                <p className="line-clamp-1 text-[12px] font-bold text-white">{p.caption || "Mandram photo"}</p>
                <p className="text-[10px] font-semibold text-white/70">{eventName(p.eventId)} · {timeAgo(p.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* add modal */}
      <Modal open={addOpen} onClose={() => { if (!busy) setAddOpen(false); }} title="Add Photo" description="Upload from your device or paste a link" maxWidth="max-w-lg">
        <AddPhotoForm
          events={events}
          defaultEventId={eventId || undefined}
          submitting={busy}
          error={formError}
          onSubmit={async (input) => {
            setBusy(true);
            setFormError(null);
            try {
              await api.post("/api/gallery", input);
              toast.success("Photo added to gallery");
              setAddOpen(false);
              reload();
            } catch (e) {
              setFormError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* lightbox */}
      {lightbox && typeof document !== "undefined" ? (
        <Modal open onClose={() => setLightbox(null)} hideClose maxWidth="max-w-3xl">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.caption ?? "Mandram photo"} className="max-h-[62dvh] w-full rounded-xl object-contain" />
            <button onClick={() => setLightbox(null)} aria-label="Close preview" className="absolute right-2 top-2 rounded-full bg-navy-950/70 p-2 text-white backdrop-blur transition-colors hover:bg-navy-950"><X className="size-4" /></button>
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{lightbox.caption || "Mandram photo"}</p>
              <p className="mt-0.5 text-[12px] text-muted">{eventName(lightbox.eventId)} · added by {lightbox.uploadedBy} · {timeAgo(lightbox.createdAt)}</p>
            </div>
            {admin ? (
              <Button variant="danger" size="sm" onClick={() => { setDeleting(lightbox); setLightbox(null); }}>
                <Trash2 className="size-3.5" /> Remove
              </Button>
            ) : null}
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          setBusy(true);
          try {
            await api.del(`/api/gallery/${deleting.id}`);
            toast.success("Photo removed");
            setDeleting(null);
            reload();
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        loading={busy}
        title="Remove this photo?"
        body={<>“<b>{deleting?.caption ?? "Photo"}</b>” will be removed from the gallery.</>}
        confirmLabel="Remove"
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-bold transition-colors",
        active ? "bg-navy-800 text-white dark:bg-navy-600" : "card-surface text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function AddPhotoForm({
  events, defaultEventId, submitting, error, onSubmit, onCancel,
}: {
  events: Event[];
  defaultEventId?: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: GalleryInput) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [eventId, setEventId] = useState(defaultEventId ?? events[0]?.id ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const onFile = (f: File | undefined) => {
    setReadError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setReadError("Choose an image file (jpg, png, webp…)");
      return;
    }
    if (f.size > 2_500_000) {
      setReadError("Photo is larger than ~2.5 MB — please choose a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.onerror = () => setReadError("Could not read that image.");
    reader.readAsDataURL(f);
  };

  const canSubmit = mode === "url" ? url.trim().length > 0 : Boolean(preview);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            { id: "file", label: "Upload · பதிவேற்று", icon: ImagePlus },
            { id: "url", label: "Link · இணைப்பு", icon: Link2 },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setMode(m.id); setReadError(null); }}
            className={cn("flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-bold transition-colors", mode === m.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(10,16,30,0.08)]" : "text-muted")}
          >
            <m.icon className="size-3.5" /> {m.label}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2/60 px-4 py-8 text-center transition-colors hover:border-saffron-400 hover:bg-saffron-50/60 dark:hover:bg-saffron-500/5"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected" className="max-h-44 rounded-xl object-contain" />
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/15 dark:text-saffron-400"><ImagePlus className="size-6" /></span>
                <span className="text-[13.5px] font-bold">Choose a photo</span>
                <span className="text-[11px] font-medium text-faint">JPG / PNG / WEBP · up to ~2.5 MB</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {readError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{readError}</p> : null}
        </>
      ) : (
        <Field label="Image URL" ta="பட இணைப்பு" required>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/photo.jpg" leading={<Link2 className="size-4" />} />
        </Field>
      )}

      <Field label="Caption" ta="விளக்க உரை">
        <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="Pandal lighting on the first evening…" />
      </Field>
      <Field label="Event (optional)" ta="நிகழ்வு">
        <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">General · பொது</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </Select>
      </Field>

      {(error || readError) ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error ?? readError}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!canSubmit}
          loading={submitting}
          onClick={() => onSubmit({ url: mode === "url" ? url.trim() : preview ?? "", caption, eventId: eventId || null })}
        >
          <ImagePlus className="size-4" /> Add to gallery
        </Button>
      </div>
    </div>
  );
}
