"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Medal, Swords, UserRound, Users } from "lucide-react";
import type { GameListItem } from "@/lib/data/repository";
import { gameKindMeta, GameStatusPill } from "./meta";

export function GameCard({ game, index = 0 }: { game: GameListItem; index?: number }) {
  const meta = gameKindMeta(game.kind);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
    >
      <Link
        href={`/games/${game.id}`}
        className="card-surface group block overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      >
        <div className="brand-gradient relative flex h-20 items-end justify-between bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl drop-shadow">{meta.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-extrabold tracking-tight text-white">{game.name}</p>
              <p className="truncate text-[12px] font-semibold text-navy-200">
                {game.tamilName || meta.ta}
                {game.eventName ? ` · ${game.eventName}` : game.eventName === null ? " · General" : ""}
              </p>
            </div>
          </div>
          <span className="absolute right-3 top-3"><GameStatusPill status={game.status} /></span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line px-1 py-2.5 text-center">
          <div className="px-2">
            <p className="text-[15px] font-extrabold tabular-nums">{game.teamCount || (game.mode === "individual" ? "—" : 0)}</p>
            <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-faint"><Users className="size-3" /> Teams</p>
          </div>
          <div className="px-2">
            <p className="text-[15px] font-extrabold tabular-nums">{game.participantCount}</p>
            <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-faint"><UserRound className="size-3" /> Players</p>
          </div>
          <div className="px-2">
            <p className="text-[15px] font-extrabold tabular-nums">{game.playedCount}/{game.matchCount}</p>
            <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-faint"><Swords className="size-3" /> Played</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[12px] font-bold text-muted transition-colors group-hover:text-saffron-600 dark:group-hover:text-saffron-400">
          <span className="inline-flex items-center gap-1.5">
            <Medal className="size-3.5 text-faint" />
            {game.hasResults ? "Results declared" : game.mode === "team" ? `${game.teamCount} team${game.teamCount === 1 ? "" : "s"} registered` : `${game.participantCount} participant${game.participantCount === 1 ? "" : "s"}`}
          </span>
          <ChevronRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
