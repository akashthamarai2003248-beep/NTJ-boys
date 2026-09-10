"use client";

import type { GameKind, GameStatus } from "@/lib/data/types";
import { GAME_KINDS, GAME_STATUSES, TEAM_COLORS } from "@/lib/data/types";
import { Badge, type BadgeTone } from "@/components/shared/tone";

export function gameKindMeta(kind: GameKind) {
  return GAME_KINDS.find((k) => k.value === kind) ?? GAME_KINDS[5];
}

const statusTone: Record<GameStatus, BadgeTone> = {
  open: "leaf",
  ongoing: "saffron",
  results: "gold",
  completed: "navy",
};

export function GameStatusPill({ status }: { status: GameStatus }) {
  const s = GAME_STATUSES.find((x) => x.value === status) ?? GAME_STATUSES[0];
  return <Badge tone={statusTone[status]} dot>{s.label}</Badge>;
}

/* Team identity colours — static classes so Tailwind keeps them. */
export const TEAM_STYLES: Record<string, { dot: string; soft: string; ring: string; hex: string }> = {
  saffron: { dot: "bg-saffron-500", soft: "bg-saffron-100 text-saffron-800 dark:bg-saffron-500/15 dark:text-saffron-300", ring: "ring-saffron-500", hex: "#ff9933" },
  navy: { dot: "bg-navy-600", soft: "bg-navy-100 text-navy-800 dark:bg-navy-500/20 dark:text-navy-200", ring: "ring-navy-500", hex: "#3d5fac" },
  leaf: { dot: "bg-leaf-500", soft: "bg-leaf-100 text-leaf-800 dark:bg-leaf-500/15 dark:text-leaf-300", ring: "ring-leaf-500", hex: "#31a76c" },
  red: { dot: "bg-red-500", soft: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", ring: "ring-red-500", hex: "#ef4444" },
  violet: { dot: "bg-violet-500", soft: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", ring: "ring-violet-500", hex: "#8b5cf6" },
  gold: { dot: "bg-gold-500", soft: "bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-300", ring: "ring-gold-400", hex: "#e7b942" },
};

export const TEAM_COLOR_OPTIONS = TEAM_COLORS.map((c) => ({ value: c.value, label: c.label }));
export function teamStyle(color: string) {
  return TEAM_STYLES[color] ?? TEAM_STYLES.saffron;
}
