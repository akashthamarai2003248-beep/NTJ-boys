import type {
  ActivityLog, AppRole, Collection, CollectionInput, DB, DemoUser, Event,
  EventInput, EventStats, Expense, ExpenseInput, GalleryInput, GalleryPhoto,
  Game, GameInput, GameKind, GameMode, GameResult, GameResultInput, Match,
  MatchInput, Member, MemberInput, Participant, ParticipantInput, PaymentMethod,
  ExpenseCategory, MemberPosition, Team, TeamInput,
} from "./types";
import { GAME_KINDS, PAYMENT_CHOICES } from "./types";
import { getDB, mutateDB, resetToSeed } from "./store";
import { normalizeName, normalizePhone, uid } from "@/lib/utils/id";
import { toISO, resolveEventStatus, todayISO } from "@/lib/utils/date";
import {
  HttpError, canWriteFinances, canWriteEvents, canWriteMembers, canManageSettings,
  assertPermission as assert,
} from "./guards";

export { HttpError, canWriteFinances, canWriteEvents, canWriteMembers, canManageSettings };

/** Supabase mode is env-driven; mirrored here (not imported) so unit
 * tests can keep exercising the pure local repository in isolation. */
export function isSupabaseMode(): boolean {
  if (process.env.NEXT_PUBLIC_DATA_MODE === "local") return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}

/** Loads the Supabase write repository only when running in Supabase mode. */
async function supabaseRepo(): Promise<typeof import("./supabase-repo")> {
  return import("./supabase-repo");
}

/* ═══════════════════════════════════════════════════════════════
 * Repository — every read/write goes through here.
 * Balances are ALWAYS derived (varavu − selavu), never stored.
 *
 * In Supabase mode (Phase 3) mutations delegate to supabase-repo.ts
 * and reads get their snapshot from supabase-store.ts via loadDB();
 * the pure functions below stay the single source of truth for
 * derived stats in both modes.
 * ═══════════════════════════════════════════════════════════════ */

/* ── Auth (demo mode) ────────────────────────────────────── */

export function getUserById(id: string | undefined | null): DemoUser | null {
  if (!id) return null;
  return getDB().users.find((u) => u.id === id) ?? null;
}

export function findUser(identifier: string, password: string): DemoUser | null {
  const key = identifier.trim().toLowerCase();
  const phoneKey = normalizePhone(key);
  return (
    getDB().users.find(
      (u) =>
        u.password === password &&
        (u.email.toLowerCase() === key ||
         (phoneKey && normalizePhone(u.phone) === phoneKey) ||
         (phoneKey && u.email.toLowerCase() === `${phoneKey}@nbm.mandram`)),
    ) ?? null
  );
}

/* ── Registration (self signup — new members get member role) ── */

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
}

function validateRegister(raw: RegisterInput): { name: string; phone: string; email: string; password: string } {
  const name = raw.name?.trim();
  const phone = normalizePhone(raw.phone);
  if (!name) throw new HttpError(400, "Enter your name");
  if (phone.length < 10) throw new HttpError(400, "Enter a valid 10-digit phone number");
  if (raw.email?.trim() && !raw.email.includes("@")) throw new HttpError(400, "Enter a valid email address");
  const email = (raw.email?.trim() || `${phone}@nbm.mandram`).toLowerCase();
  const password = raw.password ?? "";
  if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");
  return { name, phone, email, password };
}

/** Pure registration — mutates the passed DB (used by tests). */
export function applyRegister(db: DB, raw: RegisterInput): DemoUser {
  const input = validateRegister(raw);
  if (db.users.some((u) => normalizePhone(u.phone) === input.phone))
    throw new HttpError(409, "This phone number is already registered");
  if (raw.email?.trim() && db.users.some((u) => u.email.toLowerCase() === input.email))
    throw new HttpError(409, "This email is already registered");
  const user: DemoUser = {
    id: uid("usr"),
    name: input.name,
    phone: input.phone,
    email: input.email,
    password: input.password,
    role: "member",
    position: "Member",
  };
  db.users.push(user);
  addLog(db, user, { action: "added", entity: "member", label: `${user.name} joined (self-registered)` });
  return user;
}

/** Register a new member account (local demo mode). */
export async function registerUser(raw: RegisterInput): Promise<DemoUser> {
  return mutateDB((db) => applyRegister(db, raw));
}

/* ── Small shared helpers ────────────────────────────────── */

export function sum(list: { amount: number }[]): number {
  return list.reduce((s, x) => s + x.amount, 0);
}

function eventName(db: DB, id?: string | null): string | null {
  if (!id) return null;
  return db.events.find((e) => e.id === id)?.name ?? null;
}

function addLog(
  db: DB,
  actor: DemoUser,
  input: {
    action: ActivityLog["action"];
    entity: ActivityLog["entity"];
    label: string;
    amount?: number | null;
    eventName?: string | null;
  },
) {
  db.activity.unshift({
    id: uid("act"),
    actorId: actor.id,
    actorName: actor.name,
    action: input.action,
    entity: input.entity,
    label: input.label,
    amount: input.amount ?? null,
    eventName: input.eventName ?? null,
    at: new Date().toISOString(),
  });
  // keep the log bounded for the demo store
  if (db.activity.length > 400) db.activity.length = 400;
}

const nowISO = () => new Date().toISOString();

/* ── Dashboard ───────────────────────────────────────────── */

export type Period = "week" | "month" | "year" | "all";

export interface SeriesBucket {
  key: string;
  label: string;
  varavu: number;
  selavu: number;
}

function bucketByDate(
  db: DB,
  start: Date,
  end: Date,
  labelFor: (d: Date) => string,
): Map<string, SeriesBucket> {
  const buckets = new Map<string, SeriesBucket>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = toISO(d);
    buckets.set(key, { key, label: labelFor(d), varavu: 0, selavu: 0 });
  }
  return buckets;
}

function addToBucket(map: Map<string, SeriesBucket>, iso: string, amount: number, isVaravu: boolean) {
  const b = map.get(iso);
  if (!b) return;
  if (isVaravu) b.varavu += amount;
  else b.selavu += amount;
}

function collapseToMonths(map: Map<string, SeriesBucket>): SeriesBucket[] {
  const byMonth = new Map<string, SeriesBucket>();
  for (const b of map.values()) {
    const m = b.key.slice(0, 7); // yyyy-mm
    const cur = byMonth.get(m);
    if (!cur) {
      const d = new Date(`${m}-01T00:00:00`);
      byMonth.set(m, {
        key: m,
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        varavu: b.varavu,
        selavu: b.selavu,
      });
    } else {
      cur.varavu += b.varavu;
      cur.selavu += b.selavu;
    }
  }
  return [...byMonth.values()];
}

export function buildSeries(db: DB, period: Period): SeriesBucket[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    const map = bucketByDate(db, start, today, (d) =>
      d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2),
    );
    for (const c of db.collections) addToBucket(map, c.date, c.amount, true);
    for (const e of db.expenses) addToBucket(map, e.date, e.amount, false);
    return [...map.values()];
  }

  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const map = bucketByDate(db, start, end, (d) => String(d.getDate()));
    for (const c of db.collections) addToBucket(map, c.date, c.amount, true);
    for (const e of db.expenses) addToBucket(map, e.date, e.amount, false);
    return [...map.values()];
  }

  if (period === "year") {
    const y = today.getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const map = new Map<string, SeriesBucket>();
    for (let m = 0; m < 12; m++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      map.set(key, { key, label: months[m], varavu: 0, selavu: 0 });
    }
    for (const c of db.collections) {
      if (c.date.startsWith(String(y))) {
        const k = c.date.slice(0, 7);
        const b = map.get(k);
        if (b) b.varavu += c.amount;
      }
    }
    for (const e of db.expenses) {
      if (e.date.startsWith(String(y))) {
        const k = e.date.slice(0, 7);
        const b = map.get(k);
        if (b) b.selavu += e.amount;
      }
    }
    return [...map.values()];
  }

  // all time — month buckets only
  const all = new Map<string, SeriesBucket>();
  for (const c of db.collections) addToBucket(all, c.date, c.amount, true);
  for (const e of db.expenses) addToBucket(all, e.date, e.amount, false);
  const collapsed = collapseToMonths(all);
  return collapsed.length > 0 ? collapsed : buildSeries(db, "year");
}

/* ── Aggregations ────────────────────────────────────────── */

function collectionStats(db: DB, eventId?: string): EventStats {
  const cs = db.collections.filter((c) => (eventId ? c.eventId === eventId : true));
  const es = db.expenses.filter((e) => (eventId ? e.eventId === eventId : true));
  const varavu = sum(cs);
  const selavu = sum(es);
  return { varavu, selavu, balance: varavu - selavu };
}

export function totals(db: DB): EventStats & {
  members: number;
  paidMembers: number;
  paidCount: number;
} {
  const s = collectionStats(db);
  const paidSet = new Set(
    db.collections
      .map((c) => (c.phone?.trim() ? c.phone.trim() : c.personName.trim().toLowerCase()))
      .filter(Boolean),
  );
  return {
    ...s,
    members: db.members.length,
    paidMembers: paidSet.size,
    paidCount: db.collections.length,
  };
}

export function listEvents(db: DB) {
  return db.events
    .map((e) => ({
      ...e,
      status: resolveEventStatus(e.status, e.startDate, e.endDate),
      ...collectionStats(db, e.id),
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function listUpcoming(db: DB, limit = 4) {
  return listEvents(db)
    .filter((e) => e.status !== "completed")
    .slice(0, limit);
}

export function getEventStats(db: DB, eventId: string): EventStats {
  return collectionStats(db, eventId);
}

/* ── Activity ────────────────────────────────────────────── */

export function recentActivity(db: DB, limit = 10): ActivityLog[] {
  return [...db.activity]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/* ── Collections ─────────────────────────────────────────── */

export interface CollectionFilters {
  q?: string;
  eventId?: string | null;
  category?: string | null;
  payment?: PaymentMethod | null;
  from?: string | null;
  to?: string | null;
  sort?: "newest" | "amount_desc" | "amount_asc" | "name";
  page?: number;
  perPage?: number;
}

export interface CollectionPage {
  items: Collection[];
  total: number;
  sum: number;
  allSum: number;
  page: number;
  pages: number;
}

export function queryCollections(db: DB, f: CollectionFilters): CollectionPage {
  let items = [...db.collections];
  const q = f.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (c) =>
        c.personName.toLowerCase().includes(q) ||
        c.receiptNumber.toLowerCase().includes(q) ||
        (c.street ?? "").toLowerCase().includes(q) ||
        (c.category ?? "").toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q),
    );
  }
  if (f.eventId) items = items.filter((c) => c.eventId === f.eventId);
  if (f.category) {
    items = items.filter(
      (c) => (c.category ?? c.street ?? "ஊர் வசூல்") === f.category,
    );
  }
  if (f.payment) items = items.filter((c) => c.paymentMethod === f.payment);
  if (f.from) items = items.filter((c) => c.date >= (f.from ?? ""));
  if (f.to) items = items.filter((c) => c.date <= (f.to ?? ""));

  const sumFiltered = sum(items);

  const sort = f.sort ?? "newest";
  items.sort((a, b) => {
    if (sort === "amount_desc") return b.amount - a.amount;
    if (sort === "amount_asc") return a.amount - b.amount;
    if (sort === "name") return a.personName.localeCompare(b.personName);
    return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  });

  const perPage = Math.max(1, f.perPage ?? 10);
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, pages);
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    total: items.length,
    sum: sumFiltered,
    allSum: sum(db.collections),
    page: safePage,
    pages,
  };
}

function validateCollection(input: CollectionInput): CollectionInput {
  const personName =
    input.contributionType === "voice" && !input.personName?.trim()
      ? "Voice entry"
      : input.personName?.trim() ?? "";
  const amount = Math.round(Number(input.amount));
  if (!personName) throw new HttpError(400, "Person name is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Amount must be a positive number");
  if (!input.date) throw new HttpError(400, "Date is required");
  return { ...input, personName, amount, contributionType: input.contributionType ?? "namePhone" };
}

function nextReceiptNumber(db: DB, date: string): string {
  const year = String(new Date(date).getFullYear());
  const prefix = `NBM-${year}-`;
  const existing = db.collections
    .filter((c) => c.receiptNumber.startsWith(prefix))
    .map((c) => Number(c.receiptNumber.slice(prefix.length)) || 0);
  const max = existing.length ? Math.max(...existing) : 0;
  let candidate = max + 1;
  while (existing.includes(candidate)) candidate += 1;
  return `${prefix}${String(candidate).padStart(4, "0")}`;
}

export async function createCollection(actor: DemoUser, raw: CollectionInput): Promise<Collection> {
  if (isSupabaseMode()) return (await supabaseRepo()).createCollection(actor, raw);
  assert(canWriteFinances(actor.role), "Only Admin and Treasurer can record collections");
  return mutateDB((db) => {
    const input = validateCollection(raw);
    const rec: Collection = {
      id: uid("col"),
      receiptNumber: nextReceiptNumber(db, input.date),
      personName: input.personName,
      phone: input.phone?.trim() || null,
      street: (input.category || input.street)?.trim() || "ஊர் வசூல்",
      category: (input.category || input.street)?.trim() || "ஊர் வசூல்",
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      contributionType: input.contributionType,
      date: input.date,
      eventId: input.eventId || null,
      notes: input.notes?.trim() || null,
      createdBy: actor.name,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    db.collections.push(rec);
    addLog(db, actor, {
      action: "added", entity: "collection", label: rec.personName,
      amount: rec.amount, eventName: eventName(db, rec.eventId),
    });
    return rec;
  });
}

export async function updateCollection(actor: DemoUser, id: string, raw: CollectionInput): Promise<Collection> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateCollection(actor, id, raw);
  assert(canWriteFinances(actor.role));
  return mutateDB((db) => {
    const rec = db.collections.find((c) => c.id === id);
    if (!rec) throw new HttpError(404, "Collection not found");
    const input = validateCollection(raw);
    const yearChanged = new Date(rec.date).getFullYear() !== new Date(input.date).getFullYear();
    rec.personName = input.personName;
    rec.phone = input.phone?.trim() || null;
    rec.street = (input.category || input.street)?.trim() || "ஊர் வசூல்";
    rec.category = (input.category || input.street)?.trim() || "ஊர் வசூல்";
    rec.amount = input.amount;
    rec.paymentMethod = input.paymentMethod;
    rec.contributionType = input.contributionType;
    rec.date = input.date;
    rec.eventId = input.eventId || null;
    rec.notes = input.notes?.trim() || null;
    rec.updatedAt = nowISO();
    if (yearChanged) rec.receiptNumber = nextReceiptNumber(db, input.date);
    addLog(db, actor, {
      action: "edited", entity: "collection", label: rec.personName,
      amount: rec.amount, eventName: eventName(db, rec.eventId),
    });
    return rec;
  });
}

export async function deleteCollection(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteCollection(actor, id);
  assert(canWriteFinances(actor.role));
  await mutateDB((db) => {
    const idx = db.collections.findIndex((c) => c.id === id);
    if (idx === -1) throw new HttpError(404, "Collection not found");
    const rec = db.collections[idx];
    db.collections.splice(idx, 1);
    addLog(db, actor, {
      action: "deleted", entity: "collection", label: rec.personName,
      amount: rec.amount, eventName: eventName(db, rec.eventId),
    });
  });
}

/* ── Expenses ────────────────────────────────────────────── */

export interface ExpenseFilters {
  q?: string;
  eventId?: string | null;
  category?: ExpenseCategory | null;
  payment?: PaymentMethod | null;
  from?: string | null;
  to?: string | null;
  sort?: "newest" | "amount_desc" | "amount_asc" | "title";
  page?: number;
  perPage?: number;
}

export interface ExpensePage {
  items: Expense[];
  total: number;
  sum: number;
  allSum: number;
  page: number;
  pages: number;
}

export function queryExpenses(db: DB, f: ExpenseFilters): ExpensePage {
  let items = [...db.expenses];
  const q = f.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.paidBy.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q),
    );
  }
  if (f.eventId) items = items.filter((e) => e.eventId === f.eventId);
  if (f.category) items = items.filter((e) => e.category === f.category);
  if (f.payment) items = items.filter((e) => e.paymentMethod === f.payment);
  if (f.from) items = items.filter((e) => e.date >= (f.from ?? ""));
  if (f.to) items = items.filter((e) => e.date <= (f.to ?? ""));

  const sumFiltered = sum(items);

  const sort = f.sort ?? "newest";
  items.sort((a, b) => {
    if (sort === "amount_desc") return b.amount - a.amount;
    if (sort === "amount_asc") return a.amount - b.amount;
    if (sort === "title") return a.title.localeCompare(b.title);
    return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  });

  const perPage = Math.max(1, f.perPage ?? 10);
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, pages);
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    total: items.length,
    sum: sumFiltered,
    allSum: sum(db.expenses),
    page: safePage,
    pages,
  };
}

function validateExpense(input: ExpenseInput): ExpenseInput & { category: ExpenseCategory; paidBy: string } {
  const title = input.title?.trim();
  const amount = Math.round(Number(input.amount));
  const paidBy = input.paidBy?.trim() || "Mandram";
  const category = input.category || "Other";
  if (!title) throw new HttpError(400, "Expense title is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Amount must be a positive number");
  if (!input.date) throw new HttpError(400, "Date is required");
  return { ...input, title, paidBy, category, amount };
}

export async function createExpense(actor: DemoUser, raw: ExpenseInput): Promise<Expense> {
  if (isSupabaseMode()) return (await supabaseRepo()).createExpense(actor, raw);
  assert(canWriteFinances(actor.role), "Only Admin and Treasurer can record expenses");
  return mutateDB((db) => {
    const input = validateExpense(raw);
    const rec: Expense = {
      id: uid("exp"),
      title: input.title,
      category: input.category,
      amount: input.amount,
      eventId: input.eventId || null,
      paidBy: input.paidBy,
      date: input.date,
      paymentMethod: input.paymentMethod,
      description: input.description?.trim() || null,
      billUrl: input.billUrl || null,
      createdBy: actor.name,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    db.expenses.push(rec);
    addLog(db, actor, {
      action: "added", entity: "expense", label: rec.title,
      amount: rec.amount, eventName: eventName(db, rec.eventId),
    });
    return rec;
  });
}

export async function updateExpense(actor: DemoUser, id: string, raw: ExpenseInput): Promise<Expense> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateExpense(actor, id, raw);
  assert(canWriteFinances(actor.role));
  return mutateDB((db) => {
    const rec = db.expenses.find((e) => e.id === id);
    if (!rec) throw new HttpError(404, "Expense not found");
    const input = validateExpense(raw);
    rec.title = input.title;
    rec.category = input.category;
    rec.amount = input.amount;
    rec.eventId = input.eventId || null;
    rec.paidBy = input.paidBy;
    rec.date = input.date;
    rec.paymentMethod = input.paymentMethod;
    rec.description = input.description?.trim() || null;
    rec.billUrl = input.billUrl || null;
    rec.updatedAt = nowISO();
    addLog(db, actor, {
      action: "edited", entity: "expense", label: rec.title,
      amount: rec.amount, eventName: eventName(db, rec.eventId),
    });
    return rec;
  });
}

export async function deleteExpense(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteExpense(actor, id);
  assert(canWriteFinances(actor.role));
  await mutateDB((db) => {
    const idx = db.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new HttpError(404, "Expense not found");
    const rec = db.expenses[idx];
    db.expenses.splice(idx, 1);
    addLog(db, actor, {
      action: "deleted", entity: "expense", label: rec.title,
      amount: rec.amount, eventName: eventName(db, rec.eventId),
    });
  });
}

/* ── Events ──────────────────────────────────────────────── */

function validateEvent(input: EventInput): EventInput {
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Event name is required");
  if (!input.startDate) throw new HttpError(400, "Start date is required");
  if (!input.endDate || input.endDate < input.startDate)
    throw new HttpError(400, "End date must be on or after the start date");
  const status = resolveEventStatus(input.status, input.startDate, input.endDate);
  return { ...input, name, tamilName: input.tamilName?.trim() || "", status };
}

export async function createEvent(actor: DemoUser, raw: EventInput): Promise<Event> {
  if (isSupabaseMode()) return (await supabaseRepo()).createEvent(actor, raw);
  assert(canWriteEvents(actor.role), "Only Admin can create events");
  return mutateDB((db) => {
    const input = validateEvent(raw);
    const rec: Event = {
      id: uid("evt"),
      ...input,
      cover: input.cover || null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    db.events.push(rec);
    addLog(db, actor, { action: "added", entity: "event", label: rec.name });
    return rec;
  });
}

export async function updateEvent(actor: DemoUser, id: string, raw: EventInput): Promise<Event> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateEvent(actor, id, raw);
  assert(canWriteEvents(actor.role));
  return mutateDB((db) => {
    const rec = db.events.find((e) => e.id === id);
    if (!rec) throw new HttpError(404, "Event not found");
    const input = validateEvent(raw);
    Object.assign(rec, input, { cover: input.cover || null, updatedAt: nowISO() });
    addLog(db, actor, { action: "edited", entity: "event", label: rec.name });
    return rec;
  });
}

export async function deleteEvent(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteEvent(actor, id);
  assert(canWriteEvents(actor.role));
  await mutateDB((db) => {
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) throw new HttpError(404, "Event not found");
    const rec = db.events[idx];
    // keep historical money records; they just detach from the event
    db.events.splice(idx, 1);
    addLog(db, actor, { action: "deleted", entity: "event", label: rec.name });
  });
}

/* ── Members ─────────────────────────────────────────────── */

function normalizeMember(db: DB) {
  return (m: Member) => {
    const n = normalizeName(m.name);
    const p = normalizePhone(m.phone);
    const matched = db.collections.filter(
      (c) => normalizeName(c.personName) === n || (p.length > 5 && normalizePhone(c.phone ?? "") === p),
    );
    const contributionTotal = sum(matched);
    const eventsParticipated = [
      ...new Set(
        matched
          .map((c) => db.events.find((e) => e.id === c.eventId)?.name)
          .filter((x): x is string => Boolean(x)),
      ),
    ];
    return { ...m, contributionTotal, eventsParticipated };
  };
}

export function listMembers(db: DB) {
  const decorate = normalizeMember(db);
  return db.members
    .map((m) => decorate(m))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function queryMembers(db: DB, f: { q?: string; area?: string; role?: MemberPosition | null }) {
  let items = listMembers(db);
  const q = f.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.street.toLowerCase().includes(q) ||
        normalizePhone(m.phone).includes(normalizePhone(q)),
    );
  }
  if (f.area) items = items.filter((m) => m.street.toLowerCase().includes(f.area!.toLowerCase()));
  if (f.role) items = items.filter((m) => m.role === f.role);
  return items;
}

export function getMember(db: DB, id: string) {
  const m = db.members.find((x) => x.id === id);
  return m ? normalizeMember(db)(m) : null;
}

function validateMember(input: MemberInput): Required<Omit<MemberInput, "photo">> & { photo?: string | null } {
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Member name is required");
  if (!input.phone?.trim()) throw new HttpError(400, "Phone number is required");
  if (normalizePhone(input.phone).length < 10) throw new HttpError(400, "Enter a valid 10-digit phone number");
  const joinedDate = input.joinedDate || todayISO();
  const role = input.role || "Member";
  const street = input.street?.trim() || "";
  return { ...input, name, phone: input.phone.trim(), street, role, joinedDate, photo: input.photo || null };
}

export async function createMember(actor: DemoUser, raw: MemberInput): Promise<Member> {
  if (isSupabaseMode()) return (await supabaseRepo()).createMember(actor, raw);
  assert(canWriteMembers(actor.role), "Only Admin can manage members");
  return mutateDB((db) => {
    const input = validateMember(raw);
    const rec: Member = {
      id: uid("mem"),
      name: input.name,
      phone: input.phone.trim(),
      street: input.street,
      role: input.role,
      joinedDate: input.joinedDate,
      photo: input.photo || null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    db.members.push(rec);
    addLog(db, actor, { action: "added", entity: "member", label: rec.name });
    return rec;
  });
}

export async function updateMember(actor: DemoUser, id: string, raw: MemberInput): Promise<Member> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateMember(actor, id, raw);
  assert(canWriteMembers(actor.role));
  return mutateDB((db) => {
    const rec = db.members.find((m) => m.id === id);
    if (!rec) throw new HttpError(404, "Member not found");
    const input = validateMember({
      ...raw,
      street: raw.street !== undefined ? raw.street : rec.street,
      role: raw.role !== undefined ? raw.role : rec.role,
      joinedDate: raw.joinedDate !== undefined ? raw.joinedDate : rec.joinedDate,
    });
    rec.name = input.name;
    rec.phone = input.phone.trim();
    rec.street = input.street;
    rec.role = input.role;
    rec.joinedDate = input.joinedDate;
    rec.photo = input.photo || null;
    rec.updatedAt = nowISO();
    addLog(db, actor, { action: "edited", entity: "member", label: rec.name });
    return rec;
  });
}

export async function deleteMember(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteMember(actor, id);
  assert(canWriteMembers(actor.role));
  await mutateDB((db) => {
    const idx = db.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new HttpError(404, "Member not found");
    const rec = db.members[idx];
    db.members.splice(idx, 1);
    addLog(db, actor, { action: "deleted", entity: "member", label: rec.name });
  });
}

/* ── Games / sports ──────────────────────────────────────── */

export interface GameListItem extends Game {
  teamCount: number;
  participantCount: number;
  matchCount: number;
  playedCount: number;
  hasResults: boolean;
  eventName?: string | null;
}

export interface GameDetail extends Game {
  teams: Team[];
  participants: Participant[];
  matches: Match[];
  results: GameResult[];
  event?: Event | null;
  podium: PodiumRow[];
}

export function gameModeOf(kind: GameKind): GameMode {
  return GAME_KINDS.find((k) => k.value === kind)?.mode ?? "individual";
}

function validateGame(input: GameInput): Required<Pick<GameInput, "name">> & GameInput {
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Game name is required");
  return { ...input, name, tamilName: input.tamilName?.trim() || "" };
}

export function listGames(db: DB, f: { eventId?: string; q?: string; status?: string | null } = {}): GameListItem[] {
  let items = [...db.games];
  if (f.eventId === "none") items = items.filter((g) => !g.eventId);
  else if (f.eventId) items = items.filter((g) => g.eventId === f.eventId);
  const q = f.q?.trim().toLowerCase();
  if (q) items = items.filter((g) => g.name.toLowerCase().includes(q) || g.tamilName.includes(q));
  if (f.status) items = items.filter((g) => g.status === f.status);
  return items
    .map((g) => {
      const teamCount = db.teams.filter((t) => t.gameId === g.id).length;
      const matches = db.matches.filter((m) => m.gameId === g.id);
      return {
        ...g,
        teamCount,
        participantCount: db.participants.filter((p) => p.gameId === g.id).length,
        matchCount: matches.length,
        playedCount: matches.filter((m) => m.status === "played").length,
        hasResults: db.results.some((r) => r.gameId === g.id),
        eventName: eventName(db, g.eventId),
      };
    })
    .sort((a, b) => {
      if (a.status === "completed" !== (b.status === "completed")) {
        return a.status === "completed" ? 1 : -1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export interface PodiumRow {
  position: 1 | 2 | 3;
  medal: string;
  rank: string; // "1st Place" etc
  ta: string;
  kind: GameResult["kind"];
  name: string;
  subtitle: string;
  color?: string | null; // team swatch value
  resultId: string;
}

const MEDALS: Record<1 | 2 | 3, { medal: string; rank: string; ta: string }> = {
  1: { medal: "🥇", rank: "1st Place", ta: "முதல் பரிசு" },
  2: { medal: "🥈", rank: "2nd Place", ta: "இரண்டாம் பரிசு" },
  3: { medal: "🥉", rank: "3rd Place", ta: "மூன்றாம் பரிசு" },
};

export function resolvePodium(db: DB, game: Game): PodiumRow[] {
  const rows = db.results
    .filter((r) => r.gameId === game.id)
    .sort((a, b) => a.position - b.position);
  return rows.map((r) => {
    const m = MEDALS[r.position];
    if (r.kind === "team") {
      const team = db.teams.find((t) => t.id === r.teamId);
      return {
        position: r.position, medal: m.medal, rank: m.rank, ta: m.ta, kind: r.kind,
        name: r.label?.trim() || team?.name || "—",
        subtitle: team ? `Team · ${team.name}` : (r.note ?? ""),
        color: team?.color ?? null,
        resultId: r.id,
      };
    }
    if (r.kind === "participant") {
      const p = db.participants.find((x) => x.id === r.participantId);
      const team = p?.teamId ? db.teams.find((t) => t.id === p.teamId) : null;
      return {
        position: r.position, medal: m.medal, rank: m.rank, ta: m.ta, kind: r.kind,
        name: r.label?.trim() || p?.name || "—",
        subtitle: team ? `Member · ${team.name}` : (r.note ?? "Participant"),
        color: team?.color ?? null,
        resultId: r.id,
      };
    }
    return {
      position: r.position, medal: m.medal, rank: m.rank, ta: m.ta, kind: r.kind,
      name: r.label?.trim() || "Award",
      subtitle: r.note ?? "Special award",
      color: null,
      resultId: r.id,
    };
  });
}

export function getGameDetail(db: DB, id: string): GameDetail | null {
  const game = db.games.find((g) => g.id === id);
  if (!game) return null;
  return {
    ...game,
    teams: db.teams.filter((t) => t.gameId === id),
    participants: db.participants.filter((p) => p.gameId === id),
    matches: db.matches.filter((m) => m.gameId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    results: db.results.filter((r) => r.gameId === id),
    event: game.eventId ? db.events.find((e) => e.id === game.eventId) ?? null : null,
    podium: resolvePodium(db, game),
  };
}

export async function createGame(actor: DemoUser, raw: GameInput): Promise<Game> {
  if (isSupabaseMode()) return (await supabaseRepo()).createGame(actor, raw);
  assert(canWriteEvents(actor.role), "Only Admin can create games");
  return mutateDB((db) => {
    const input = validateGame(raw);
    const now = nowISO();
    const rec: Game = {
      id: uid("game"),
      eventId: input.eventId || null,
      name: input.name,
      tamilName: input.tamilName ?? "",
      kind: input.kind,
      mode: gameModeOf(input.kind),
      status: input.status ?? "open",
      rules: input.rules?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };
    db.games.push(rec);
    addLog(db, actor, { action: "added", entity: "game", label: rec.name, eventName: eventName(db, rec.eventId) });
    return rec;
  });
}

export async function updateGame(actor: DemoUser, id: string, raw: Partial<GameInput>): Promise<Game> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateGame(actor, id, raw);
  assert(canWriteEvents(actor.role), "Only Admin can edit games");
  return mutateDB((db) => {
    const rec = db.games.find((g) => g.id === id);
    if (!rec) throw new HttpError(404, "Game not found");
    if (raw.name !== undefined) {
      const name = raw.name.trim();
      if (!name) throw new HttpError(400, "Game name is required");
      rec.name = name;
    }
    if (raw.tamilName !== undefined) rec.tamilName = raw.tamilName.trim() || "";
    if (raw.kind !== undefined) {
      rec.kind = raw.kind;
      rec.mode = gameModeOf(raw.kind);
    }
    if (raw.status !== undefined) rec.status = raw.status;
    if (raw.rules !== undefined) rec.rules = raw.rules.trim() || null;
    if (raw.eventId !== undefined) rec.eventId = raw.eventId || null;
    rec.updatedAt = nowISO();
    addLog(db, actor, { action: "edited", entity: "game", label: rec.name, eventName: eventName(db, rec.eventId) });
    return rec;
  });
}

export async function deleteGame(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteGame(actor, id);
  assert(canWriteEvents(actor.role), "Only Admin can delete games");
  await mutateDB((db) => {
    const rec = db.games.find((g) => g.id === id);
    if (!rec) throw new HttpError(404, "Game not found");
    db.games = db.games.filter((g) => g.id !== id);
    db.teams = db.teams.filter((t) => t.gameId !== id);
    db.participants = db.participants.filter((p) => p.gameId !== id);
    db.matches = db.matches.filter((m) => m.gameId !== id);
    db.results = db.results.filter((r) => r.gameId !== id);
    addLog(db, actor, { action: "deleted", entity: "game", label: rec.name });
  });
}

function requireTeamGame(db: DB, gameId: string): Game {
  const game = db.games.find((g) => g.id === gameId);
  if (!game) throw new HttpError(404, "Game not found");
  if (game.mode !== "team") throw new HttpError(400, "This game is individual — teams aren't used");
  return game;
}

export async function createTeam(actor: DemoUser, input: TeamInput): Promise<Team> {
  if (isSupabaseMode()) return (await supabaseRepo()).createTeam(actor, input);
  assert(canWriteEvents(actor.role), "Only Admin can manage teams");
  return mutateDB((db) => {
    const game = requireTeamGame(db, input.gameId);
    const name = input.name?.trim();
    if (!name) throw new HttpError(400, "Team name is required");
    if (db.teams.some((t) => t.gameId === game.id && t.name.toLowerCase() === name.toLowerCase()))
      throw new HttpError(400, "A team with this name already exists");
    const rec: Team = {
      id: uid("team"), gameId: game.id, name, color: input.color || "saffron", createdAt: nowISO(),
    };
    db.teams.push(rec);
    addLog(db, actor, { action: "added", entity: "game", label: `Team “${name}” in ${game.name}`, eventName: eventName(db, game.eventId) });
    return rec;
  });
}

export async function updateTeam(actor: DemoUser, id: string, raw: Partial<TeamInput>): Promise<Team> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateTeam(actor, id, raw);
  assert(canWriteEvents(actor.role), "Only Admin can manage teams");
  return mutateDB((db) => {
    const rec = db.teams.find((t) => t.id === id);
    if (!rec) throw new HttpError(404, "Team not found");
    const name = raw.name?.trim();
    if (name) {
      if (db.teams.some((t) => t.gameId === rec.gameId && t.id !== id && t.name.toLowerCase() === name.toLowerCase()))
        throw new HttpError(400, "A team with this name already exists");
      rec.name = name;
    }
    if (raw.color) rec.color = raw.color;
    addLog(db, actor, { action: "edited", entity: "game", label: `Team “${rec.name}”` });
    return rec;
  });
}

export async function deleteTeam(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteTeam(actor, id);
  assert(canWriteEvents(actor.role), "Only Admin can manage teams");
  await mutateDB((db) => {
    const rec = db.teams.find((t) => t.id === id);
    if (!rec) throw new HttpError(404, "Team not found");
    db.teams = db.teams.filter((t) => t.id !== id);
    db.participants.forEach((p) => { if (p.teamId === id) p.teamId = null; });
    db.matches = db.matches.filter((m) => m.teamAId !== id && m.teamBId !== id);
    db.results = db.results.filter((r) => r.teamId !== id);
    addLog(db, actor, { action: "deleted", entity: "game", label: `Team “${rec.name}”` });
  });
}

export async function createParticipant(actor: DemoUser, input: ParticipantInput): Promise<Participant> {
  if (isSupabaseMode()) return (await supabaseRepo()).createParticipant(actor, input);
  assert(canWriteEvents(actor.role), "Only Admin can manage participants");
  return mutateDB((db) => {
    const game = db.games.find((g) => g.id === input.gameId);
    if (!game) throw new HttpError(404, "Game not found");
    const name = input.name?.trim();
    if (!name) throw new HttpError(400, "Participant name is required");
    if (input.teamId) {
      const team = db.teams.find((t) => t.id === input.teamId);
      if (!team || team.gameId !== game.id) throw new HttpError(400, "Team does not belong to this game");
    }
    const rec: Participant = {
      id: uid("part"), gameId: game.id,
      teamId: input.teamId || null,
      memberId: input.memberId || null,
      name, phone: input.phone?.trim() || null,
      createdAt: nowISO(),
    };
    db.participants.push(rec);
    addLog(db, actor, { action: "added", entity: "game", label: `Participant ${rec.name} in ${game.name}` });
    return rec;
  });
}

export async function deleteParticipant(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteParticipant(actor, id);
  assert(canWriteEvents(actor.role), "Only Admin can manage participants");
  await mutateDB((db) => {
    const rec = db.participants.find((p) => p.id === id);
    if (!rec) throw new HttpError(404, "Participant not found");
    db.participants = db.participants.filter((p) => p.id !== id);
    db.results = db.results.filter((r) => r.participantId !== id);
    addLog(db, actor, { action: "deleted", entity: "game", label: `Participant ${rec.name}` });
  });
}

export async function createMatch(actor: DemoUser, input: MatchInput): Promise<Match> {
  if (isSupabaseMode()) return (await supabaseRepo()).createMatch(actor, input);
  assert(canWriteEvents(actor.role), "Only Admin can record matches");
  return mutateDB((db) => {
    const game = requireTeamGame(db, input.gameId);
    return writeMatch(db, actor, game, input, null);
  });
}

export async function updateMatch(actor: DemoUser, id: string, raw: Partial<MatchInput>): Promise<Match> {
  if (isSupabaseMode()) return (await supabaseRepo()).updateMatch(actor, id, raw);
  assert(canWriteEvents(actor.role), "Only Admin can record matches");
  return mutateDB((db) => {
    const rec = db.matches.find((m) => m.id === id);
    if (!rec) throw new HttpError(404, "Match not found");
    const game = requireTeamGame(db, rec.gameId);
    const merged: MatchInput = {
      gameId: rec.gameId,
      round: raw.round ?? rec.round,
      teamAId: raw.teamAId !== undefined ? raw.teamAId : rec.teamAId,
      teamBId: raw.teamBId !== undefined ? raw.teamBId : rec.teamBId,
      scoreA: raw.scoreA !== undefined ? raw.scoreA : rec.scoreA,
      scoreB: raw.scoreB !== undefined ? raw.scoreB : rec.scoreB,
      note: raw.note !== undefined ? raw.note : rec.note ?? "",
      playedAt: raw.playedAt !== undefined ? raw.playedAt : rec.playedAt,
    };
    return writeMatch(db, actor, game, merged, rec);
  });
}

function writeMatch(db: DB, actor: DemoUser, game: Game, input: MatchInput, existing: Match | null): Match {
  const round = input.round?.trim();
  if (!round) throw new HttpError(400, "Round is required (e.g. Final)");
  const a = input.teamAId ?? null;
  const b = input.teamBId ?? null;
  if (!a || !b || a === b) throw new HttpError(400, "Pick two different teams");
  const ta = db.teams.find((t) => t.id === a);
  const tb = db.teams.find((t) => t.id === b);
  if (!ta || ta.gameId !== game.id || !tb || tb.gameId !== game.id)
    throw new HttpError(400, "Both teams must belong to this game");
  const scoreA = input.scoreA === undefined || input.scoreA === null ? null : Math.round(Number(input.scoreA));
  const scoreB = input.scoreB === undefined || input.scoreB === null ? null : Math.round(Number(input.scoreB));
  if (scoreA !== null && (!Number.isFinite(scoreA) || scoreA < 0)) throw new HttpError(400, "Score A must be 0 or more");
  if (scoreB !== null && (!Number.isFinite(scoreB) || scoreB < 0)) throw new HttpError(400, "Score B must be 0 or more");
  const hasScores = scoreA !== null && scoreB !== null;
  const now = nowISO();
  const base = {
    round, teamAId: a, teamBId: b, scoreA: hasScores ? scoreA : null, scoreB: hasScores ? scoreB : null,
    status: (hasScores ? "played" : "pending") as Match["status"],
    winnerTeamId: hasScores ? (scoreA === scoreB ? null : scoreA > scoreB ? a : b) : null,
    note: input.note?.trim() || null,
    playedAt: hasScores ? (input.playedAt || toISO(new Date())) : null,
  };
  if (existing) {
    Object.assign(existing, base, { updatedAt: now });
    if (existing.status === "played" && game.status === "open") game.status = "ongoing";
    addLog(db, actor, { action: "edited", entity: "game", label: `${game.name} · ${round} result`, eventName: eventName(db, game.eventId) });
    return existing;
  }
  const rec: Match = { id: uid("m"), gameId: game.id, ...base, createdAt: now, updatedAt: now };
  db.matches.push(rec);
  if (game.status === "open") game.status = "ongoing";
  addLog(db, actor, {
    action: hasScores ? "added" : "added", entity: "game",
    label: hasScores ? `${game.name} · ${round} recorded` : `${game.name} · ${round} scheduled`,
    eventName: eventName(db, game.eventId),
  });
  return rec;
}

export async function deleteMatch(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteMatch(actor, id);
  assert(canWriteEvents(actor.role), "Only Admin can delete matches");
  await mutateDB((db) => {
    const rec = db.matches.find((m) => m.id === id);
    if (!rec) throw new HttpError(404, "Match not found");
    db.matches = db.matches.filter((m) => m.id !== id);
    addLog(db, actor, { action: "deleted", entity: "game", label: `Match ${rec.round}` });
  });
}

function validateResultRow(db: DB, game: Game, r: GameResultInput): GameResultInput {
  if (r.position < 1 || r.position > 3 || !Number.isInteger(r.position))
    throw new HttpError(400, "Position must be 1, 2 or 3");
  if (r.kind === "team") {
    const team = db.teams.find((t) => t.id === r.teamId);
    if (!team || team.gameId !== game.id) throw new HttpError(400, "Winner team must belong to this game");
  } else if (r.kind === "participant") {
    const p = db.participants.find((x) => x.id === r.participantId);
    if (!p || p.gameId !== game.id) throw new HttpError(400, "Participant must belong to this game");
  } else if (r.kind === "title") {
    if (!r.label?.trim()) throw new HttpError(400, "Title award needs a label (e.g. Best Batsman)");
  }
  return r;
}

/** Replace the podium for a game — exactly positions 1..3 from the array. */
export async function setGameResults(
  actor: DemoUser, gameId: string, rows: GameResultInput[],
): Promise<GameResult[]> {
  if (isSupabaseMode()) return (await supabaseRepo()).setGameResults(actor, gameId, rows);
  assert(canWriteEvents(actor.role), "Only Admin can declare results");
  return mutateDB((db) => {
    const game = db.games.find((g) => g.id === gameId);
    if (!game) throw new HttpError(404, "Game not found");
    if (!Array.isArray(rows)) throw new HttpError(400, "Results must be an array");
    if (rows.length === 0) throw new HttpError(400, "Add at least one podium entry");
    const seen = new Set<number>();
    const validated = rows.map((r) => {
      const v = validateResultRow(db, game, r);
      if (seen.has(v.position)) throw new HttpError(400, `Position ${v.position} is used twice`);
      seen.add(v.position);
      return v;
    });
    const now = nowISO();
    const saved = validated.map((v) => ({
      id: uid("res"), gameId: game.id,
      position: v.position, kind: v.kind,
      teamId: v.teamId || null, participantId: v.participantId || null,
      label: v.label?.trim() || null, note: v.note?.trim() || null,
      recordedAt: now,
    }));
    db.results = [...db.results.filter((r) => r.gameId !== game.id), ...saved];
    game.status = "results";
    game.updatedAt = now;
    addLog(db, actor, { action: "added", entity: "game", label: `Results declared · ${game.name}`, eventName: eventName(db, game.eventId) });
    return saved;
  });
}

export async function clearGameResults(actor: DemoUser, gameId: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).clearGameResults(actor, gameId);
  assert(canWriteEvents(actor.role), "Only Admin can manage results");
  await mutateDB((db) => {
    const game = db.games.find((g) => g.id === gameId);
    if (!game) throw new HttpError(404, "Game not found");
    db.results = db.results.filter((r) => r.gameId !== gameId);
    game.status = db.matches.some((m) => m.gameId === gameId && m.status === "played") ? "ongoing" : "open";
    addLog(db, actor, { action: "deleted", entity: "game", label: `Results cleared · ${game.name}` });
  });
}

/* ── Gallery ─────────────────────────────────────────────── */

export function listGallery(db: DB, f: { eventId?: string } = {}): GalleryPhoto[] {
  let items = [...db.gallery];
  if (f.eventId) items = items.filter((p) => p.eventId === f.eventId);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function validateGalleryUrl(url: string): string {
  const u = url.trim();
  const ok =
    u.startsWith("data:image/") ||
    /^https?:\/\//i.test(u);
  if (!ok) throw new HttpError(400, "Image must be a http(s) URL or an uploaded image");
  if (u.length > 4_000_000) throw new HttpError(400, "Image is too large — keep photos under ~2.5 MB");
  return u;
}

export async function createGalleryItem(actor: DemoUser, input: GalleryInput): Promise<GalleryPhoto> {
  if (isSupabaseMode()) return (await supabaseRepo()).createGalleryItem(actor, input);
  assert(canWriteEvents(actor.role), "Only Admin can upload photos");
  return mutateDB((db) => {
    if (!input.url) throw new HttpError(400, "Choose an image");
    const url = validateGalleryUrl(input.url);
    const rec: GalleryPhoto = {
      id: uid("gal"),
      eventId: input.eventId || null,
      url,
      caption: input.caption?.trim() || null,
      uploadedBy: actor.name,
      createdAt: nowISO(),
    };
    db.gallery.push(rec);
    addLog(db, actor, { action: "added", entity: "gallery", label: rec.caption || "Photo", eventName: eventName(db, rec.eventId) });
    return rec;
  });
}

export async function deleteGalleryItem(actor: DemoUser, id: string): Promise<void> {
  if (isSupabaseMode()) return (await supabaseRepo()).deleteGalleryItem(actor, id);
  assert(canWriteEvents(actor.role), "Only Admin can remove photos");
  await mutateDB((db) => {
    const rec = db.gallery.find((g) => g.id === id);
    if (!rec) throw new HttpError(404, "Photo not found");
    db.gallery = db.gallery.filter((g) => g.id !== id);
    addLog(db, actor, { action: "deleted", entity: "gallery", label: rec.caption || "Photo" });
  });
}

/* ── Reports / public overview ───────────────────────────── */

export interface ReportsData {
  totals: EventStats & {
    members: number;
    paidMembers?: number;
    paidCount?: number;
    collectionCount: number;
    expenseCount: number;
  };
  year: string | "all";
  yearTotals: EventStats;
  byEvent: { id: string; name: string; tamilName: string; type: Event["type"]; status: Event["status"]; varavu: number; selavu: number; balance: number }[];
  byMethod: { method: PaymentMethod; label: string; varavu: number; selavu: number }[];
  byCategory: { category: ExpenseCategory; amount: number; count: number; pct: number }[];
  topDonors: { name: string; total: number; count: number }[];
}

export function buildReports(db: DB, year: string | "all" = "all"): ReportsData {
  const withinYear = (d: string) => year === "all" || d.startsWith(String(year));
  const yearCols = db.collections.filter((c) => withinYear(c.date));
  const yearExps = db.expenses.filter((e) => withinYear(e.date));
  const t = totals(db);

  const byEvent = listEvents(db).map((e) => ({
    id: e.id, name: e.name, tamilName: e.tamilName, type: e.type, status: e.status,
    varavu: e.varavu, selavu: e.selavu, balance: e.balance,
  }));
  byEvent.unshift({
    id: "__general", name: "General fund · பொது நிதி", tamilName: "", type: "community" as const, status: "completed" as const,
    varavu: sum(db.collections.filter((c) => !c.eventId)),
    selavu: sum(db.expenses.filter((e) => !e.eventId)),
    balance: sum(db.collections.filter((c) => !c.eventId)) - sum(db.expenses.filter((e) => !e.eventId)),
  });

  // the Mandram records only Cash / GPay (UPI) — legacy bank/other rows (if any)
  // still count in the totals but get no breakdown row of their own
  const byMethod = PAYMENT_CHOICES.map((m) => ({
    method: m.value, label: m.label,
    varavu: sum(db.collections.filter((c) => c.paymentMethod === m.value && withinYear(c.date))),
    selavu: sum(db.expenses.filter((e) => e.paymentMethod === m.value && withinYear(e.date))),
  }));

  const catMap = new Map<ExpenseCategory, { amount: number; count: number }>();
  for (const e of db.expenses) {
    if (!withinYear(e.date)) continue;
    const cur = catMap.get(e.category) ?? { amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    catMap.set(e.category, cur);
  }
  const catTotal = [...catMap.values()].reduce((s, c) => s + c.amount, 0);
  const byCategory: ReportsData["byCategory"] = [...catMap.entries()]
    .map(([category, c]) => ({
      category, amount: c.amount, count: c.count,
      pct: catTotal ? Math.round((c.amount / catTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const donorMap = new Map<string, { total: number; count: number }>();
  for (const c of db.collections) {
    const cur = donorMap.get(c.personName) ?? { total: 0, count: 0 };
    cur.total += c.amount;
    cur.count += 1;
    donorMap.set(c.personName, cur);
  }
  const topDonors = [...donorMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    totals: { ...t, collectionCount: db.collections.length, expenseCount: db.expenses.length },
    year,
    yearTotals: { varavu: sum(yearCols), selavu: sum(yearExps), balance: sum(yearCols) - sum(yearExps) },
    byEvent, byMethod, byCategory, topDonors,
  };
}

export interface PublicOverview {
  enabled: boolean;
  totals: EventStats & { members: number };
  events: {
    id: string; name: string; tamilName: string; type: Event["type"]; status: Event["status"];
    startDate: string; endDate: string; location: string; description: string;
    varavu: number; selavu: number; balance: number;
  }[];
  updatedAt: string;
}

export function publicOverview(db: DB): PublicOverview {
  const evs = listEvents(db);
  return {
    enabled: db.settings.publicView,
    totals: { ...totals(db) },
    events: evs.map((e) => ({
      id: e.id, name: e.name, tamilName: e.tamilName, type: e.type, status: e.status,
      startDate: e.startDate, endDate: e.endDate, location: e.location, description: e.description,
      varavu: e.varavu, selavu: e.selavu, balance: e.balance,
    })),
    updatedAt: db.settings.updatedAt,
  };
}

/* ── Settings ────────────────────────────────────────────── */

export async function setSettings(
  actor: DemoUser,
  patch: Partial<{ publicView: boolean }>,
): Promise<{ publicView: boolean }> {
  if (isSupabaseMode()) return (await supabaseRepo()).setSettings(actor, patch);
  assert(canManageSettings(actor.role), "Only Admin can change settings");
  return mutateDB((db) => {
    if (typeof patch.publicView === "boolean") db.settings.publicView = patch.publicView;
    db.settings.updatedAt = nowISO();
    addLog(db, actor, {
      action: "edited",
      entity: "settings",
      label: `Public view ${db.settings.publicView ? "enabled" : "disabled"}`,
    });
    return { publicView: db.settings.publicView };
  });
}

export async function resetDemoData(): Promise<void> {
  if (isSupabaseMode()) throw new HttpError(400, "Reset demo data is only available in local demo mode");
  await resetToSeed();
}

/* ── Global search ───────────────────────────────────────── */

export interface SearchHit {
  type: "member" | "collection" | "expense" | "event";
  id: string;
  title: string;
  subtitle: string;
  amount?: number;
  meta?: string;
  route: string;
}

export function searchAll(db: DB, rawQuery: string): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 1) return [];
  const hits: SearchHit[] = [];

  const ev = db.events
    .filter(
      (e) => e.name.toLowerCase().includes(q) || e.tamilName.includes(rawQuery.trim()) || e.location.toLowerCase().includes(q),
    )
    .slice(0, 4)
    .map<SearchHit>((e) => ({
      type: "event", id: e.id, title: e.name, subtitle: e.location, route: `/events/${e.id}`,
    }));
  hits.push(...ev);

  const mem = listMembers(db)
    .filter((m) => m.name.toLowerCase().includes(q) || m.street.toLowerCase().includes(q))
    .slice(0, 5)
    .map<SearchHit>((m) => ({
      type: "member", id: m.id, title: m.name, subtitle: m.street, route: "/members",
    }));
  hits.push(...mem);

  const col = db.collections
    .filter(
      (c) =>
        c.personName.toLowerCase().includes(q) ||
        c.receiptNumber.toLowerCase().includes(q) ||
        (c.street ?? "").toLowerCase().includes(q),
    )
    .slice(0, 5)
    .map<SearchHit>((c) => ({
      type: "collection", id: c.id, title: c.personName, subtitle: c.receiptNumber,
      amount: c.amount, meta: eventName(db, c.eventId) ?? "General fund", route: "/collections",
    }));
  hits.push(...col);

  const exp = db.expenses
    .filter((e) => e.title.toLowerCase().includes(q) || e.paidBy.toLowerCase().includes(q))
    .slice(0, 5)
    .map<SearchHit>((e) => ({
      type: "expense", id: e.id, title: e.title, subtitle: e.category,
      amount: e.amount, meta: eventName(db, e.eventId) ?? "General", route: "/expenses",
    }));
  hits.push(...exp);

  return hits;
}
