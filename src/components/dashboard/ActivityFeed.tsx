"use client";

import { motion } from "framer-motion";
import { CalendarDays, Camera, HandCoins, Settings, TrendingDown, Trophy, Users, type LucideIcon } from "lucide-react";
import type { ActivityLog } from "@/lib/data/types";
import { formatINR } from "@/lib/utils/money";
import { timeAgo } from "@/lib/utils/date";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { useLang, type TFunc } from "@/lib/i18n";

const entityIcon: Record<ActivityLog["entity"], LucideIcon> = {
  collection: HandCoins,
  expense: TrendingDown,
  event: CalendarDays,
  member: Users,
  settings: Settings,
  game: Trophy,
  gallery: Camera,
};

const entityTa: Record<ActivityLog["entity"], string> = {
  collection: "வரவு",
  expense: "செலவு",
  event: "நிகழ்வு",
  member: "உறுப்பினர்",
  settings: "",
  game: "விளையாட்டு",
  gallery: "புகைப்படம்",
};

const entityEn: Record<ActivityLog["entity"], string> = {
  collection: "Collection",
  expense: "Expense",
  event: "Event",
  member: "Member",
  settings: "",
  game: "Game",
  gallery: "Photo",
};

const identity: TFunc = (en) => en;

export function describeLog(
  log: ActivityLog,
  t: TFunc = identity,
  ta = false,
): { main: string; meta: string; verb: string; positive?: boolean } {
  const amt = log.amount !== null && log.amount !== undefined ? formatINR(log.amount) : "";
  const verb = log.action === "added" ? t("added", "சேர்க்கப்பட்டது") : log.action === "edited" ? t("updated", "புதுப்பிக்கப்பட்டது") : t("deleted", "நீக்கப்பட்டது");

  let main: string;
  if (log.entity === "collection") {
    main =
      log.action === "added"
        ? t(`${amt} received from ${log.label}`, `${log.label} வழங்கிய ${amt}`)
        : log.action === "edited"
          ? t(`Updated ${amt} collection · ${log.label}`, `${amt} வரவு புதுப்பிக்கப்பட்டது · ${log.label}`)
          : t(`Removed collection · ${log.label}`, `வரவு நீக்கப்பட்டது · ${log.label}`);
  } else if (log.entity === "expense") {
    main =
      log.action === "added"
        ? t(`${amt} spent on ${log.label}`, `${log.label} -க்கு ${amt} செலவு`)
        : log.action === "edited"
          ? t(`Updated ${amt} expense · ${log.label}`, `${amt} செலவு புதுப்பிக்கப்பட்டது · ${log.label}`)
          : t(`Removed expense · ${log.label}`, `செலவு நீக்கப்பட்டது · ${log.label}`);
  } else if (log.entity === "event") {
    main =
      log.action === "deleted"
        ? t(`Removed event · ${log.label}`, `நிகழ்வு நீக்கப்பட்டது · ${log.label}`)
        : log.action === "added"
          ? t(`Created event · ${log.label}`, `நிகழ்வு உருவாக்கப்பட்டது · ${log.label}`)
          : t(`Updated event · ${log.label}`, `நிகழ்வு புதுப்பிக்கப்பட்டது · ${log.label}`);
  } else if (log.entity === "member") {
    main = t(`${verb} member · ${log.label}`, `${log.action === "added" ? "உறுப்பினர் சேர்க்கப்பட்டார்" : log.action === "edited" ? "உறுப்பினர் புதுப்பிக்கப்பட்டார்" : "உறுப்பினர் நீக்கப்பட்டார்"} · ${log.label}`);
  } else if (log.entity === "game") {
    main =
      log.action === "deleted"
        ? t(`Removed · ${log.label}`, `நீக்கப்பட்டது · ${log.label}`)
        : t(`Added · ${log.label}`, `சேர்க்கப்பட்டது · ${log.label}`);
  } else if (log.entity === "gallery") {
    main =
      log.action === "added"
        ? t(`Added photo · ${log.label}`, `புகைப்படம் சேர்க்கப்பட்டது · ${log.label}`)
        : t(`Removed photo · ${log.label}`, `புகைப்படம் நீக்கப்பட்டது · ${log.label}`);
  } else {
    main = log.label;
  }

  const entityWord = log.entity !== "settings" ? (ta ? entityTa[log.entity] : entityEn[log.entity]) : "";
  const metaParts = [log.actorName, entityWord, log.eventName ?? "", timeAgo(log.at, ta)].filter(Boolean);
  return { main, meta: metaParts.join(" · "), verb, positive: log.action === "added" && log.entity === "collection" };
}

export function ActivityFeed({ logs, limit = 7 }: { logs: ActivityLog[]; limit?: number }) {
  const { t, tamilVisible } = useLang();
  return (
    <div className="space-y-1">
      {logs.slice(0, limit).map((log, i) => {
        const { main, meta, positive } = describeLog(log, t, tamilVisible);
        const Icon = entityIcon[log.entity];
        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex w-full min-w-0 max-w-full items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2/70"
          >
            <Avatar name={log.actorName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-snug">
                <span className={cn("mr-1", positive ? "text-leaf-600 dark:text-leaf-400" : "")}>{main}</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-faint">
                <Icon className="size-3 shrink-0" />
                <span className="truncate">{meta}</span>
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
