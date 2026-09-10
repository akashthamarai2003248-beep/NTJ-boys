"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "saffron" | "navy" | "leaf" | "gold" | "muted" | "red" | "violet";

const tones: Record<Tone, string> = {
  saffron: "bg-saffron-100 text-saffron-800 dark:bg-saffron-500/15 dark:text-saffron-300",
  navy: "bg-navy-100 text-navy-800 dark:bg-navy-500/20 dark:text-navy-200",
  leaf: "bg-leaf-100 text-leaf-800 dark:bg-leaf-500/15 dark:text-leaf-300",
  gold: "bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300",
  muted: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

export function Badge({
  children,
  tone = "muted",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  );
}

const roleTone: Record<string, Tone> = {
  President: "gold",
  Secretary: "violet",
  Treasurer: "saffron",
  Coordinator: "navy",
  Member: "muted",
  Volunteer: "leaf",
};

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <Badge tone={roleTone[role] ?? "muted"} className={className}>
      {role}
    </Badge>
  );
}
