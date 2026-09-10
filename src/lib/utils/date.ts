/** Date helpers — all app dates travel as yyyy-mm-dd (local). */

export const DAY = 86400000;

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** "05 Sep" / "05 Sep 2026" */
export function formatShort(iso: string): string {
  if (!iso) return "";
  const d = parseISO(iso);
  const withYear = d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatLong(iso: string): string {
  if (!iso) return "";
  return parseISO(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "2d ago"-style labels for ISO timestamps (Tamil when `ta`). */
export function timeAgo(ts: string, ta = false): string {
  const then = new Date(ts).getTime();
  const diff = Date.now() - then;
  const u = (en: string, tamil: string) => (ta ? tamil : en);
  if (diff < 60000) return u("Just now", "இப்போதுதான்");
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return u(`${mins}m ago`, `${mins} நிமிடம் முன்`);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return u(`${hrs}h ago`, `${hrs} மணி முன்`);
  const days = Math.floor(hrs / 24);
  if (days < 7) return u(`${days}d ago`, `${days} நாள் முன்`);
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return u(`${weeks}w ago`, `${weeks} வாரம் முன்`);
  const months = Math.floor(days / 30);
  if (months < 12) return u(`${months}mo ago`, `${months} மாதம் முன்`);
  return u(`${Math.floor(days / 365)}y ago`, `${Math.floor(days / 365)} ஆண்டு முன்`);
}

export function friendlyDay(iso: string): string {
  return parseISO(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** yyyy-mm-dd difference in whole days (b - a) */
export function diffDays(aISO: string, bISO: string): number {
  return Math.round((startOfDay(parseISO(bISO)).getTime() - startOfDay(parseISO(aISO)).getTime()) / DAY);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}
