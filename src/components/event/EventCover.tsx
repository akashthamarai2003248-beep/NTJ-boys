"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { Event } from "@/lib/data/types";
import { eventTypeMeta } from "@/components/shared/meta";

const GRADIENTS = [
  "linear-gradient(135deg, #0c1b3f 0%, #17346e 55%, #1e4685 100%)",
  "linear-gradient(135deg, #1a1036 0%, #32206b 60%, #45277e 100%)",
  "linear-gradient(135deg, #0a2b26 0%, #14503f 60%, #1d6e50 100%)",
  "linear-gradient(135deg, #33140f 0%, #7a3016 60%, #a3481b 100%)",
  "linear-gradient(135deg, #12233f 0%, #1e4b7a 55%, #2a5f8f 100%)",
];

function hashId(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Event artwork: a rich gradient + type emoji, layered with a soft
 * saffron glow. Falls back to an uploaded cover image when present.
 */
export function EventCover({
  event,
  className,
  emojiClass,
  showEmoji = true,
}: {
  event: Pick<Event, "id" | "type" | "name" | "cover">;
  className?: string;
  emojiClass?: string;
  showEmoji?: boolean;
}) {
  const meta = eventTypeMeta(event.type);
  const grad = GRADIENTS[hashId(event.id) % GRADIENTS.length];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {event.cover ? (
        <Image src={event.cover} alt={event.name} fill sizes="600px" className="object-cover" unoptimized />
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: grad }} />
          <div
            className="absolute -right-10 -top-14 size-44 rounded-full opacity-25 blur-2xl"
            style={{ background: "radial-gradient(circle, #ff9933 0%, transparent 65%)" }}
          />
          <div
            className="absolute -bottom-16 -left-8 size-40 rounded-full opacity-20 blur-2xl"
            style={{ background: "radial-gradient(circle, #f6e3a4 0%, transparent 65%)" }}
          />
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1.4px)", backgroundSize: "18px 18px" }} />
          {showEmoji && (
            <span className={cn("absolute bottom-2 right-3 select-none drop-shadow-lg", emojiClass ?? "text-4xl")}>
              {meta.emoji}
            </span>
          )}
        </>
      )}
      {event.cover ? (
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-transparent" />
      ) : null}
    </div>
  );
}
