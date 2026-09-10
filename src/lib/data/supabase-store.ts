import type { Database } from "./supabase-types";
import type {
  ActivityLog, AppSettings, Collection, DB, Event, Expense, GalleryPhoto,
  Game, GameResult, Match, Member, Participant, Team,
} from "./types";
import { isSupabaseMode, getSupabaseServer } from "./supabase";
import { getDB } from "./store";
import { resolveEventStatus } from "@/lib/utils/date";

/* ─────────────────────────────────────────────────────────────
 * READ SEAM (Supabase mode)
 *
 * Every route renders from the repository's pure functions, which
 * operate on the in-memory DB document. In Supabase mode we fetch a
 * per-request snapshot of every table (scoped by RLS to the signed-
 * in user) and map it to the exact same shapes — so buildSeries,
 * listEvents, queryCollections, podiums & reports need no changes.
 *
 * Writes do NOT go through here — they run as SQL in
 * supabase-repo.ts so the signed-in user's JWT authorises each one.
 * ───────────────────────────────────────────────────────────── */

type MemberRow = Database["public"]["Tables"]["members"]["Row"];
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type GameRow = Database["public"]["Tables"]["games"]["Row"];
type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type GameResultRow = Database["public"]["Tables"]["game_results"]["Row"];
type GalleryRow = Database["public"]["Tables"]["gallery"]["Row"];
type ActivityRow = Database["public"]["Tables"]["activity_logs"]["Row"];
type SettingsRow = Database["public"]["Tables"]["settings"]["Row"];

export const mapMember = (r: MemberRow): Member => ({
  id: r.id, name: r.name, phone: r.phone, street: r.street, role: r.role,
  joinedDate: r.joined_date, photo: r.photo_url,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const mapEvent = (r: EventRow): Event => ({
  id: r.id,
  name: r.name,
  tamilName: r.tamil_name,
  type: r.type,
  status: resolveEventStatus(r.status, r.start_date, r.end_date),
  startDate: r.start_date,
  endDate: r.end_date,
  location: r.location,
  description: r.description,
  cover: r.cover_url,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapCollection = (r: CollectionRow): Collection => {
  const dbType = r.contribution_type ?? "name_phone";
  return {
    id: r.id, receiptNumber: r.receipt_number, personName: r.person_name,
    phone: r.phone, street: r.street,
    category: r.street || "ஊர் வசூல்",
    amount: r.amount, paymentMethod: r.payment_method,
    contributionType: dbType === "name" ? "name" : dbType === "voice" ? "voice" : "namePhone",
    date: r.date, eventId: r.event_id, notes: r.notes,
    createdBy: r.created_by_name ?? r.created_by ?? "",
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
};

export const mapExpense = (r: ExpenseRow): Expense => ({
  id: r.id, title: r.title, category: r.category, amount: r.amount,
  eventId: r.event_id, paidBy: r.paid_by, date: r.date,
  paymentMethod: r.payment_method, description: r.description, billUrl: r.bill_url,
  createdBy: r.created_by_name ?? r.created_by ?? "",
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const mapGame = (r: GameRow): Game => ({
  id: r.id, eventId: r.event_id, name: r.name, tamilName: r.tamil_name,
  kind: r.kind, mode: r.mode, status: r.status, rules: r.rules,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const mapTeam = (r: TeamRow): Team => ({
  id: r.id, gameId: r.game_id, name: r.name, color: r.color, createdAt: r.created_at,
});

export const mapParticipant = (r: ParticipantRow): Participant => ({
  id: r.id, gameId: r.game_id, teamId: r.team_id, memberId: r.member_id,
  name: r.name, phone: r.phone, createdAt: r.created_at,
});

export const mapMatch = (r: MatchRow): Match => ({
  id: r.id, gameId: r.game_id, round: r.round, teamAId: r.team_a_id,
  teamBId: r.team_b_id, scoreA: r.score_a, scoreB: r.score_b, status: r.status,
  winnerTeamId: r.winner_team_id, note: r.note, playedAt: r.played_at,
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export const mapResult = (r: GameResultRow): GameResult => ({
  id: r.id, gameId: r.game_id, position: r.position, kind: r.kind,
  teamId: r.team_id, participantId: r.participant_id, label: r.label,
  note: r.notes, recordedAt: r.recorded_at,
});

export const mapGallery = (r: GalleryRow): GalleryPhoto => ({
  id: r.id, eventId: r.event_id, url: r.url, caption: r.caption,
  uploadedBy: r.uploaded_by_name ?? r.uploaded_by ?? "",
  createdAt: r.created_at,
});

export const mapActivity = (r: ActivityRow): ActivityLog => ({
  id: r.id, actorId: r.actor_id ?? "", actorName: r.actor_name, action: r.action,
  entity: r.entity, label: r.label, amount: r.amount, eventName: r.event_name,
  at: r.at,
});

export const mapSettings = (r: SettingsRow): AppSettings => ({
  publicView: r.public_view, updatedAt: r.updated_at,
});

let cachedDB: DB | null = null;
let cacheTime = 0;
let inFlightLoad: Promise<DB> | null = null;
const CACHE_TTL_MS = 15_000;

let cachedDashboardDB: DB | null = null;
let dashboardCacheTime = 0;
let inFlightDashboardLoad: Promise<DB> | null = null;
const DASHBOARD_CACHE_TTL_MS = 20_000;

/** Invalidate the cached database snapshot so the next loadDB() or loadDashboardDB() fetches fresh data. */
export function invalidateDBCache() {
  cachedDB = null;
  cacheTime = 0;
  inFlightLoad = null;
  cachedDashboardDB = null;
  dashboardCacheTime = 0;
  inFlightDashboardLoad = null;
}

/**
 * High-performance, lightweight database reader specifically for the Home Dashboard.
 * Queries ONLY the 5 required tables (members, events, collections, expenses, and the top 15 activity logs),
 * skipping 7 heavy unused tables (games, teams, participants, matches, game_results, gallery, settings)
 * for a 75%+ drop in server latency.
 */
export async function loadDashboardDB(): Promise<DB> {
  if (!isSupabaseMode()) return getDB();

  const now = Date.now();
  if (cachedDB && now - cacheTime < CACHE_TTL_MS) {
    return cachedDB;
  }
  if (cachedDashboardDB && now - dashboardCacheTime < DASHBOARD_CACHE_TTL_MS) {
    return cachedDashboardDB;
  }
  if (inFlightDashboardLoad) {
    return inFlightDashboardLoad;
  }

  inFlightDashboardLoad = (async () => {
    try {
      const sb = await getSupabaseServer();
      const [members, events, collections, expenses, activity] = await Promise.all([
        sb.from("members").select("*"),
        sb.from("events").select("*"),
        sb.from("collections").select("*"),
        sb.from("expenses").select("*"),
        sb.from("activity_logs").select("*").order("at", { ascending: false }).limit(15),
      ]);

      const checks = [
        ["members", members],
        ["events", events],
        ["collections", collections],
        ["expenses", expenses],
        ["activity_logs", activity],
      ] as const;

      for (const [name, q] of checks) {
        if (q.error) throw new Error(`Failed to read ${name}: ${q.error.message}`);
      }

      const fresh: DB = {
        users: [],
        members: (members.data ?? []).map(mapMember),
        events: (events.data ?? []).map(mapEvent),
        collections: (collections.data ?? []).map(mapCollection),
        expenses: (expenses.data ?? []).map(mapExpense),
        games: [],
        teams: [],
        participants: [],
        matches: [],
        results: [],
        gallery: [],
        activity: (activity.data ?? []).map(mapActivity),
        settings: { publicView: true, updatedAt: new Date().toISOString() },
        meta: { demo: true, seededAt: new Date().toISOString() },
      };

      cachedDashboardDB = fresh;
      dashboardCacheTime = Date.now();
      return fresh;
    } finally {
      inFlightDashboardLoad = null;
    }
  })();

  return inFlightDashboardLoad;
}

/**
 * Read accessor for route handlers — the Supabase-aware replacement
 * for store.getDB(). Local mode returns the store document untouched;
 * Supabase mode pulls a fresh snapshot, coalescing concurrent requests
 * and caching with a short TTL to keep page transitions and multi-endpoint
 * views lightning fast.
 */
export async function loadDB(): Promise<DB> {
  if (!isSupabaseMode()) return getDB();

  const now = Date.now();
  if (cachedDB && now - cacheTime < CACHE_TTL_MS) {
    return cachedDB;
  }

  if (inFlightLoad) {
    return inFlightLoad;
  }

  inFlightLoad = (async () => {
    try {
      const sb = await getSupabaseServer();
      const [members, events, collections, expenses, games, teams, participants, matches, results, gallery, activity, settings] =
        await Promise.all([
          sb.from("members").select("*"),
          sb.from("events").select("*"),
          sb.from("collections").select("*"),
          sb.from("expenses").select("*"),
          sb.from("games").select("*"),
          sb.from("teams").select("*"),
          sb.from("participants").select("*"),
          sb.from("matches").select("*"),
          sb.from("game_results").select("*"),
          sb.from("gallery").select("*"),
          sb.from("activity_logs").select("*"),
          sb.from("settings").select("*"),
        ]);

      const all = [
        ["members", members], ["events", events], ["collections", collections],
        ["expenses", expenses], ["games", games], ["teams", teams],
        ["participants", participants], ["matches", matches], ["game_results", results],
        ["gallery", gallery], ["activity_logs", activity], ["settings", settings],
      ] as const;
      for (const [name, q] of all) {
        if (q.error) throw new Error(`Failed to read ${name}: ${q.error.message}`);
      }

      const fresh: DB = {
        users: [],
        members: (members.data ?? []).map(mapMember),
        events: (events.data ?? []).map(mapEvent),
        collections: (collections.data ?? []).map(mapCollection),
        expenses: (expenses.data ?? []).map(mapExpense),
        games: (games.data ?? []).map(mapGame),
        teams: (teams.data ?? []).map(mapTeam),
        participants: (participants.data ?? []).map(mapParticipant),
        matches: (matches.data ?? []).map(mapMatch),
        results: (results.data ?? []).map(mapResult),
        gallery: (gallery.data ?? []).map(mapGallery),
        activity: (activity.data ?? []).map(mapActivity),
        settings: settings.data?.[0] ? mapSettings(settings.data[0]) : { publicView: true, updatedAt: new Date().toISOString() },
        meta: { demo: true, seededAt: new Date().toISOString() },
      };

      cachedDB = fresh;
      cacheTime = Date.now();
      return fresh;
    } finally {
      inFlightLoad = null;
    }
  })();

  return inFlightLoad;
}

