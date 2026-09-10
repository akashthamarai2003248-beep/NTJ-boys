/** ─────────────────────────────────────────────────────────────
 * Shared domain types. Mirrors the PostgreSQL schema in
 * ./supabase/migrations/0001_init.sql 1:1.
 * ───────────────────────────────────────────────────────────── */

export type AppRole = "admin" | "treasurer" | "member";

export type MemberPosition =
  | "President"
  | "Secretary"
  | "Treasurer"
  | "Coordinator"
  | "Member"
  | "Volunteer";

export type EventType = "festival" | "sports" | "community" | "meeting" | "other";
export type EventStatus = "registration" | "upcoming" | "active" | "completed";

export type PaymentMethod = "cash" | "upi" | "bank" | "other";

export type ContributionType = "name" | "namePhone" | "voice";
/**
 * How the contributor was recorded when the contribution was received.
 * "name" — name only (no phone captured, e.g. anonymous / small cash drop)
 * "namePhone" — name + phone number on record
 * "voice" — voice / call-in entry (contributor told us, no name needed)
 */
export type ExpenseCategory =
  | "Decoration"
  | "Food"
  | "Sound"
  | "Lighting"
  | "Pandal"
  | "Idol"
  | "Sports"
  | "Prizes"
  | "Transport"
  | "Cleaning"
  | "Printing"
  | "Other";

export type ActivityAction = "added" | "edited" | "deleted";
export type ActivityEntity =
  | "collection"
  | "expense"
  | "event"
  | "member"
  | "settings"
  | "game"
  | "gallery";

/* ── Records ─────────────────────────────────────────────── */

export interface DemoUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** DEMO ONLY — plaintext demo passwords. Replaced by Supabase Auth in production. */
  password: string;
  role: AppRole;
  position: MemberPosition;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  street: string; // Street / Area
  role: MemberPosition;
  joinedDate: string; // yyyy-mm-dd
  photo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  name: string;
  tamilName: string;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  cover?: string | null; // URL / data-URL in demo; Supabase Storage in prod
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  receiptNumber: string; // NBM-2026-0001
  personName: string;
  phone?: string | null;
  street?: string | null; // Street / Area
  amount: number; // whole rupees
  paymentMethod: PaymentMethod;
  contributionType: ContributionType; // how the contributor was recorded
  date: string; // yyyy-mm-dd
  eventId?: string | null;
  notes?: string | null;
  createdBy: string; // actor display name
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  eventId?: string | null;
  paidBy: string;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string | null;
  billUrl?: string | null; // photo of the bill
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entity: ActivityEntity;
  label: string;
  amount?: number | null;
  eventName?: string | null;
  at: string; // ISO timestamp
}

export interface AppSettings {
  publicView: boolean;
  updatedAt: string;
}

/* ── Games / sports module ─────────────────────────────────── */

export type GameKind =
  | "running"
  | "cricket"
  | "football"
  | "tug"
  | "spoon"
  | "other";
/** team games run matches between teams; individual games rank participants */
export type GameMode = "team" | "individual";
export type GameStatus = "open" | "ongoing" | "results" | "completed";

export interface Game {
  id: string;
  eventId?: string | null;
  name: string;
  tamilName: string;
  kind: GameKind;
  mode: GameMode; // derived from kind, stored for convenience
  status: GameStatus;
  rules?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  gameId: string;
  name: string;
  color: string; // one of TEAM_COLORS value
  createdAt: string;
}

export interface Participant {
  id: string;
  gameId: string;
  teamId?: string | null;
  memberId?: string | null;
  name: string;
  phone?: string | null;
  createdAt: string;
}

export interface Match {
  id: string;
  gameId: string;
  round: string; // League / Semi-final / Final …
  teamAId?: string | null;
  teamBId?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  status: "pending" | "played";
  winnerTeamId?: string | null; // null when draw / not played
  note?: string | null;
  playedAt?: string | null; // yyyy-mm-dd
  createdAt: string;
  updatedAt: string;
}

/** One podium / award row of a game (top 3 places + special titles). */
export interface GameResult {
  id: string;
  gameId: string;
  position: 1 | 2 | 3; // display rank
  kind: "team" | "participant" | "title";
  teamId?: string | null;
  participantId?: string | null;
  label?: string | null; // free text, e.g. "Best Batsman" or name override
  note?: string | null;
  recordedAt: string;
}

export interface GalleryPhoto {
  id: string;
  eventId?: string | null;
  url: string; // data-URL / remote URL; Supabase Storage in prod
  caption?: string | null;
  uploadedBy: string;
  createdAt: string;
}

/** The local demo database document */
export interface DB {
  users: DemoUser[];
  members: Member[];
  events: Event[];
  collections: Collection[];
  expenses: Expense[];
  games: Game[];
  teams: Team[];
  participants: Participant[];
  matches: Match[];
  results: GameResult[];
  gallery: GalleryPhoto[];
  activity: ActivityLog[];
  settings: AppSettings;
  meta: { demo: true; seededAt: string };
}

/* ── Inputs / derived ────────────────────────────────────── */

export interface CollectionInput {
  personName: string;
  phone?: string;
  street?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  contributionType: ContributionType;
  date: string;
  eventId?: string | null;
  notes?: string;
}

export interface ExpenseInput {
  title: string;
  category?: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  eventId?: string | null;
  paidBy?: string;
  description?: string;
  billUrl?: string | null;
}

export interface EventInput {
  name: string;
  tamilName: string;
  type: EventType;
  status: EventStatus;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  cover?: string | null;
}

export interface MemberInput {
  name: string;
  phone: string;
  street: string;
  role: MemberPosition;
  joinedDate: string;
  photo?: string | null;
}

export interface EventStats {
  varavu: number;
  selavu: number;
  balance: number;
}export type EventWithStats = Event & EventStats;

export interface MemberWithStats extends Member {
  contributionTotal: number;
  eventsParticipated: string[];
}

export interface GameInput {
  eventId?: string | null;
  name: string;
  tamilName?: string;
  kind: GameKind;
  status?: GameStatus;
  rules?: string;
}

export interface TeamInput {
  gameId: string;
  name: string;
  color: string;
}

export interface ParticipantInput {
  gameId: string;
  teamId?: string | null;
  memberId?: string | null;
  name: string;
  phone?: string;
}

export interface MatchInput {
  gameId: string;
  round: string;
  teamAId?: string | null;
  teamBId?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  note?: string;
  playedAt?: string | null;
}

export interface GameResultInput {
  position: 1 | 2 | 3;
  kind: "team" | "participant" | "title";
  teamId?: string | null;
  participantId?: string | null;
  label?: string;
  note?: string;
}

export interface GalleryInput {
  eventId?: string | null;
  url: string;
  caption?: string;
}

/* ── Option lists (single source of truth for UI + validation) ── */

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; ta: string }[] = [
  { value: "cash", label: "Cash", ta: "ரொக்கம்" },
  { value: "upi", label: "GPay (UPI)", ta: "ஜிபே (யுபிஐ)" },
  { value: "bank", label: "Bank Transfer", ta: "வங்கி" },
  { value: "other", label: "Other", ta: "மற்றவை" },
];

/**
 * Payment methods the Mandram actually records — Cash or GPay (UPI).
 * Used by all pickers, filters and report breakdowns. The full
 * PAYMENT_METHODS list above is kept only so pre-existing records
 * (bank / other) still display.
 */
export const PAYMENT_CHOICES: { value: PaymentMethod; label: string; ta: string }[] = [
  { value: "cash", label: "Cash", ta: "ரொக்கம்" },
  { value: "upi", label: "GPay (UPI)", ta: "ஜிபே (யுபிஐ)" },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Decoration",
  "Food",
  "Sound",
  "Lighting",
  "Pandal",
  "Idol",
  "Sports",
  "Prizes",
  "Transport",
  "Cleaning",
  "Printing",
  "Other",
];

export const MEMBER_POSITIONS: MemberPosition[] = [
  "President",
  "Secretary",
  "Treasurer",
  "Coordinator",
  "Member",
  "Volunteer",
];

export const EVENT_TYPES: { value: EventType; label: string; ta: string; emoji: string }[] = [
  { value: "festival", label: "Festival", ta: "விழா", emoji: "🪔" },
  { value: "sports", label: "Sports", ta: "விளையாட்டு", emoji: "🏆" },
  { value: "community", label: "Community", ta: "சமூகம்", emoji: "🎉" },
  { value: "meeting", label: "Meeting", ta: "கூட்டம்", emoji: "🤝" },
  { value: "other", label: "Other", ta: "மற்றவை", emoji: "✨" },
];

export const GAME_KINDS: { value: GameKind; label: string; ta: string; emoji: string; mode: GameMode }[] = [
  { value: "cricket", label: "Cricket", ta: "கிரிக்கெட்", emoji: "🏏", mode: "team" },
  { value: "football", label: "Football", ta: "கால்பந்து", emoji: "⚽", mode: "team" },
  { value: "tug", label: "Tug of War", ta: "கயிறு இழுத்தல்", emoji: "🪢", mode: "team" },
  { value: "running", label: "Running", ta: "ஓட்டம்", emoji: "🏃", mode: "individual" },
  { value: "spoon", label: "Lemon & Spoon", ta: "எலுமிச்சை கரண்டி", emoji: "🥄", mode: "individual" },
  { value: "other", label: "Other", ta: "மற்றவை", emoji: "🎯", mode: "individual" },
];

export const GAME_STATUSES: { value: GameStatus; label: string; ta: string; tone: "saffron" | "navy" | "leaf" | "gold" | "muted" }[] = [
  { value: "open", label: "Open", ta: "பதிவு திறந்துள்ளது", tone: "leaf" },
  { value: "ongoing", label: "In Progress", ta: "நடைபெறுகிறது", tone: "saffron" },
  { value: "results", label: "Results Declared", ta: "முடிவுகள் அறிவிக்கப்பட்டன", tone: "gold" },
  { value: "completed", label: "Completed", ta: "நிறைவடைந்தது", tone: "navy" },
];

/** Team identity colours (value maps to CSS classes in team-color.ts). */
export const TEAM_COLORS: { value: string; label: string; swatch: string }[] = [
  { value: "saffron", label: "Saffron · குங்குமம்", swatch: "bg-saffron-500" },
  { value: "navy", label: "Navy · நீலம்", swatch: "bg-navy-600" },
  { value: "leaf", label: "Green · பச்சை", swatch: "bg-leaf-500" },
  { value: "red", label: "Red · சிகப்பு", swatch: "bg-red-500" },
  { value: "violet", label: "Violet · ஊதா", swatch: "bg-violet-500" },
  { value: "gold", label: "Gold · தங்கம்", swatch: "bg-gold-500" },
];

export const MATCH_ROUNDS = ["League", "Quarter-final", "Semi-final", "Final", "Friendly", "Other"] as const;

export const EVENT_STATUSES: { value: EventStatus; label: string; ta: string; tone: "saffron" | "navy" | "leaf" | "gold" | "muted" }[] = [
  { value: "active", label: "Active", ta: "நடைபெறுகிறது", tone: "leaf" },
  { value: "registration", label: "Registration Opens Soon", ta: "பதிவு விரைவில்", tone: "saffron" },
  { value: "upcoming", label: "Coming Soon", ta: "விரைவில்", tone: "navy" },
  { value: "completed", label: "Completed", ta: "நிறைவடைந்தது", tone: "muted" },
];
