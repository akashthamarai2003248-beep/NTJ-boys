"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Camera, ChevronLeft, ChevronRight, Download, ImagePlus, Link2, Loader2, SearchX, Trash2, X, ZoomIn, ZoomOut,
} from "lucide-react";
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
import { uploadImage } from "@/lib/client/upload";

interface GalleryPayload { photos: GalleryPhoto[] }
interface EventsPayload { events: Event[] }
const EMPTY_PHOTOS: GalleryPhoto[] = [];

export function GalleryView({ eventId: deepLink }: { eventId?: string }) {
  const { can, user } = usePermissions();
  const admin = can.events;
  const canAddPhoto = Boolean(user);
  const [eventId, setEventId] = useState(deepLink ?? "");
  const { data, loading, reload } = useFetch<GalleryPayload>(`/api/gallery${qs({ eventId })}`);
  const eventsFetch = useFetch<EventsPayload>("/api/events");
  const events = eventsFetch.data?.events ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [deleting, setDeleting] = useState<GalleryPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const photos = data?.photos ?? EMPTY_PHOTOS;
  const eventName = (id?: string | null) => events.find((e) => e.id === id)?.name ?? "General";
  const lightboxIndex = useMemo(() => photos.findIndex((photo) => photo.id === lightboxId), [photos, lightboxId]);
  const lightbox = lightboxIndex >= 0 ? photos[lightboxIndex] : null;

  const movePhoto = useCallback((direction: 1 | -1) => {
    if (photos.length < 2 || lightboxIndex < 0) return;
    setSlideDirection(direction);
    setLightboxId(photos[(lightboxIndex + direction + photos.length) % photos.length].id);
  }, [photos, lightboxIndex]);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") movePhoto(-1);
      if (event.key === "ArrowRight") movePhoto(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox, movePhoto]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow="Gallery · புகைப்படங்கள்"
        title="Gallery"
        ta="புகைப்படங்கள் · memories of every celebration"
        subtitle="Festival, sports and community photos from the Mandram"
        actions={canAddPhoto ? (
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
            action={canAddPhoto ? (
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
              onClick={() => { setSlideDirection(1); setLightboxId(p.id); }}
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

      {/* full-screen native gallery app viewer */}
      {lightbox && typeof document !== "undefined" && (
        <FullScreenGalleryViewer
          photo={lightbox}
          photos={photos}
          index={lightboxIndex}
          direction={slideDirection}
          eventName={eventName}
          admin={admin}
          onClose={() => setLightboxId(null)}
          onMove={movePhoto}
          onSelect={(id) => {
            setSlideDirection(photos.findIndex((photo) => photo.id === id) > lightboxIndex ? 1 : -1);
            setLightboxId(id);
          }}
          onDelete={(photo) => {
            setDeleting(photo);
            setLightboxId(null);
          }}
        />
      )}

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

function FullScreenGalleryViewer({
  photo,
  photos,
  index,
  direction,
  eventName,
  admin,
  onClose,
  onMove,
  onSelect,
  onDelete,
}: {
  photo: GalleryPhoto;
  photos: GalleryPhoto[];
  index: number;
  direction: 1 | -1;
  eventName: (id?: string | null) => string;
  admin: boolean;
  onClose: () => void;
  onMove: (direction: 1 | -1) => void;
  onSelect: (id: string) => void;
  onDelete: (photo: GalleryPhoto) => void;
}) {
  const [showControls, setShowControls] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);
  const hasMultiple = photos.length > 1;

  // Lock body scroll
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  // Preload adjacent images for 0ms transitions
  useEffect(() => {
    if (photos.length <= 1) return;
    const nextPhoto = photos[(index + 1) % photos.length];
    const prevPhoto = photos[(index - 1 + photos.length) % photos.length];
    if (nextPhoto?.url) {
      const img = new Image();
      img.src = nextPhoto.url;
    }
    if (prevPhoto?.url) {
      const img = new Image();
      img.src = prevPhoto.url;
    }
  }, [photos, index]);

  // Reset zoom & drag offset on photo change
  useEffect(() => {
    setZoom(1);
    setDragY(0);
    setIsDragging(false);
  }, [photo.id]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [index]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onMove(-1);
      else if (e.key === "ArrowRight") onMove(1);
      else if (e.key === "f" || e.key === "F") setShowControls((v) => !v);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onMove]);

  // Touch handlers for swipe & pull-down-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Pull down to dismiss if pulling downwards vertically and not zoomed
    if (dy > 12 && Math.abs(dy) > Math.abs(dx) && zoom === 1) {
      setIsDragging(true);
      setDragY(dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const startX = touchStartX.current;
    const startY = touchStartY.current;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const endY = e.changedTouches[0]?.clientY ?? startY;
    const dx = endX - startX;
    const dy = endY - startY;

    touchStartX.current = null;
    touchStartY.current = null;

    if (isDragging) {
      setIsDragging(false);
      if (dy > 100) {
        onClose();
        return;
      }
      setDragY(0);
      return;
    }

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) && zoom === 1) {
      onMove(dx < 0 ? 1 : -1);
    }
  };

  // Download photo
  const handleDownload = async () => {
    try {
      toast.info("Downloading photo…");
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `mandram-photo-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success("Photo saved to device");
    } catch {
      window.open(photo.url, "_blank");
    }
  };

  // Calculate drag opacity
  const dragOpacity = isDragging ? Math.max(0.35, 1 - dragY / 320) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${dragOpacity})`,
        transition: isDragging ? "none" : "background-color 0.25s ease-out",
      }}
    >
      {/* Top Bar */}
      <div
        className={cn(
          "absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-all duration-300",
          "pt-[max(env(safe-area-inset-top),12px)]",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="text-[13.5px] font-semibold tabular-nums tracking-wide text-white/90">
            {index + 1} / {photos.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom button */}
          <button
            type="button"
            onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
            title={zoom === 1 ? "Zoom In" : "Reset Zoom"}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            {zoom === 1 ? <ZoomIn className="size-4.5" /> : <ZoomOut className="size-4.5" />}
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            title="Save / Download photo"
            aria-label="Download photo"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            <Download className="size-4.5" />
          </button>

          {/* Delete button for admin */}
          {admin && (
            <button
              type="button"
              onClick={() => onDelete(photo)}
              title="Remove photo"
              aria-label="Remove photo"
              className="flex size-10 items-center justify-center rounded-full bg-red-500/20 text-red-400 backdrop-blur-md transition hover:bg-red-500/30 active:scale-95"
            >
              <Trash2 className="size-4.5" />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowControls((v) => !v)}
      >
        <div
          className="relative size-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `translateY(${dragY}px) scale(${isDragging ? Math.max(0.85, 1 - dragY / 700) : 1})`,
            transition: isDragging ? "none" : "transform 0.25s ease-out",
          }}
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={photo.id}
              initial={{ x: direction * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -60, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center p-0 sm:p-4"
              onClick={(e) => {
                // Prevent bubbling
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? "Mandram photo"}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setZoom((z) => (z === 1 ? 2 : 1));
                }}
                className={cn(
                  "max-h-[100dvh] max-w-[100dvw] w-auto h-auto object-contain select-none transition-transform duration-250 cursor-pointer",
                  zoom > 1 && "scale-[2] cursor-zoom-out"
                )}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop Left/Right Navigation Chevrons */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMove(-1); }}
              aria-label="Previous photo"
              className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 transition hover:bg-black/70 hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onMove(1); }}
              aria-label="Next photo"
              className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 size-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 transition hover:bg-black/70 hover:scale-105 active:scale-95"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Bar: Caption & Thumbnail Strip */}
      <div
        className={cn(
          "absolute bottom-0 inset-x-0 z-30 flex flex-col gap-2.5 px-4 pb-4 pt-8 sm:px-6 sm:pb-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-all duration-300",
          "pb-[max(env(safe-area-inset-bottom),14px)]",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full pointer-events-none"
        )}
      >
        {/* Caption & Metadata */}
        <div className="min-w-0 max-w-2xl">
          <p className="text-[15px] sm:text-[17px] font-bold text-white leading-snug drop-shadow-md">
            {photo.caption || "Mandram photo"}
          </p>
          <p className="mt-1 text-[11.5px] sm:text-[12.5px] font-medium text-white/75 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-semibold text-white">
              {eventName(photo.eventId)}
            </span>
            {photo.uploadedBy && <span>added by {photo.uploadedBy}</span>}
            <span>•</span>
            <span>{timeAgo(photo.createdAt)}</span>
          </p>
        </div>

        {/* Thumbnail Filmstrip */}
        {hasMultiple && (
          <div className="hide-scrollbar mt-1 flex items-center gap-2 overflow-x-auto py-1">
            {photos.map((item, itemIndex) => {
              const isSelected = item.id === photo.id;
              return (
                <button
                  key={item.id}
                  ref={isSelected ? activeThumbRef : null}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
                  aria-label={`View photo ${itemIndex + 1}`}
                  className={cn(
                    "relative size-12 sm:size-14 shrink-0 overflow-hidden rounded-lg transition-all",
                    isSelected
                      ? "ring-2 ring-saffron-400 scale-105 opacity-100 shadow-lg shadow-saffron-500/20"
                      : "opacity-45 hover:opacity-85"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="size-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>
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
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const onFile = async (f: File | undefined) => {
    setReadError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setReadError("Choose an image file (jpg, png, webp…)");
      return;
    }
    setUploading(true);
    setUploadInfo("Compressing to <400KB & uploading…");
    try {
      const result = await uploadImage(f, "gallery");
      setPreview(result.url);
      setUploadInfo(`Compressed (${result.formattedSize}) · ${result.storage === "supabase" ? "Supabase Storage" : "Ready"}`);
    } catch (err) {
      setReadError((err as Error).message || "Could not process that image.");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = !uploading && (mode === "url" ? url.trim().length > 0 : Boolean(preview));

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
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-surface-2/60 px-4 py-8 text-center transition-colors hover:border-saffron-400 hover:bg-saffron-50/60 disabled:opacity-60 dark:hover:bg-saffron-500/5"
          >
            {uploading ? (
              <>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/15 dark:text-saffron-400">
                  <Loader2 className="size-6 animate-spin" />
                </span>
                <span className="text-[13.5px] font-bold">Compressing to &le;400 KB…</span>
                <span className="text-[11px] font-medium text-faint">Uploading to Supabase Storage</span>
              </>
            ) : preview ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Selected" className="max-h-44 rounded-xl object-contain" />
                {uploadInfo && (
                  <p className="text-[11px] font-semibold text-leaf-600 dark:text-leaf-400">
                    {uploadInfo}
                  </p>
                )}
                <p className="text-[11px] font-bold text-saffron-600 dark:text-saffron-400">Click to replace photo</p>
              </div>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-saffron-100 text-saffron-600 dark:bg-saffron-500/15 dark:text-saffron-400">
                  <ImagePlus className="size-6" />
                </span>
                <span className="text-[13.5px] font-bold">Choose a photo</span>
                <span className="text-[11px] font-medium text-faint">
                  Auto-compressed to &le;400 KB · Stored on Supabase Storage
                </span>
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
