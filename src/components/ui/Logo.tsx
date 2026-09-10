"use client";

import { cn } from "@/lib/utils/cn";

/** NBM emblem — the circular Netaji badge from /public/nbm-logo.png */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/nbm-logo.png"
      alt=""
      aria-hidden
      className={cn("size-9 shrink-0 rounded-full object-cover", className)}
    />
  );
}

export function Logo({
  markOnly,
  compact,
  light,
  className,
}: {
  markOnly?: boolean;
  compact?: boolean;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark
        className={markOnly ? "size-8" : "size-10 rounded-full ring-1 ring-black/10 dark:ring-white/15"}
      />
      {!markOnly && (
        <div className="leading-none">
          <div
            className={cn(
              "font-extrabold tracking-[0.02em]",
              compact ? "text-[15px]" : "text-base",
              light ? "text-white" : "text-ink",
            )}
          >
            NETHAJI&nbsp;BOYS
          </div>
          <div
            className={cn(
              "mt-1 text-[11px] font-bold uppercase tracking-[0.34em]",
              light ? "text-saffron-300" : "text-saffron-600 dark:text-saffron-400",
            )}
          >
            Mandram
          </div>
        </div>
      )}
    </div>
  );
}