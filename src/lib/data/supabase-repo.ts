import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";
import type {
  ActivityAction, ActivityEntity, Collection, CollectionInput,
  Event, EventInput, Expense, ExpenseCategory, ExpenseInput, Game, GameInput, GameResult,
  GameResultInput, GalleryInput, GalleryPhoto, Match, MatchInput, Member,
  MemberInput, Participant, ParticipantInput, Team, TeamInput,
  DemoUser, GameKind, GameMode,
} from "./types";
import { GAME_KINDS } from "./types";
import {
  HttpError, canWriteFinances, canWriteEvents, canWriteMembers, canManageSettings,
  assertPermission,
} from "./guards";
import { getSupabaseServer } from "./supabase";
import {
  mapCollection, mapEvent, mapExpense, mapGame, mapGallery, mapMatch,
  mapMember, mapParticipant, mapResult, mapTeam, invalidateDBCache,
} from "./supabase-store";
import { resolveEventStatus, todayISO } from "@/lib/utils/date";

/* ═══════════════════════════════════════════════════════════════
 * SUPABASE WRITE REPOSITORY
 *
 * Mirrors the mutation functions in repository.ts against PostgreSQL
 * via the signed-in user's JWT (RLS enforces row access). Business
 * validation stays in TypeScript so the rules match the local mode;
 * reads are never duplicated here — routes use loadDB() + the pure
 * read functions in repository.ts.
 * ═══════════════════════════════════════════════════════════════ */

type SB = SupabaseClient<Database>;
const nowISO = () => new Date().toISOString();

function dbError(e: { message?: string; code?: string } | null, fallback: string): HttpError {
  const message = e?.message ?? fallback;
  if (e?.code === "42501") return new HttpError(403, "Not allowed by database policy — check the user's role.");
  return new HttpError(500, message);
}

function gameModeOf(kind: GameKind): GameMode {
  return GAME_KINDS.find((k) => k.value === kind)?.mode ?? "individual";
}

/* ── Activity logging ─────────────────────────────────────── */

async function log(
  sb: SB,
  actor: DemoUser,
  input: {
    action: ActivityAction;
    entity: ActivityEntity;
    label: string;
    amount?: number | null;
    eventName?: string | null;
  },
) {
  invalidateDBCache();
  const { error } = await sb.from("activity_logs").insert({
    actor_id: actor.id,
    actor_name: actor.name,
    action: input.action,
    entity: input.entity,
    label: input.label,
    amount: input.amount ?? null,
    event_name: input.eventName ?? null,
  });
  if (error) console.error("[supabase-repo] activity log failed:", error.message);
}

async function eventNameFor(sb: SB, eventId?: string | null): Promise<string | null> {
  if (!eventId) return null;
  const { data } = await sb.from("events").select("name").eq("id", eventId).maybeSingle();
  return data?.name ?? null;
}

/* ── Collections ──────────────────────────────────────────── */

function validateCollection(input: CollectionInput): CollectionInput {
  const personName =
    input.contributionType === "voice" && !input.personName?.trim()
      ? "Voice entry"
      : input.personName?.trim() ?? "";
  const amount = Math.round(Number(input.amount));
  if (!personName) throw new HttpError(400, "Person name is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, "Amount must be a positive number");
  if (!input.date) throw new HttpError(400, "Date is required");
  return { ...input, personName, amount };
}

export async function createCollection(actor: DemoUser, raw: CollectionInput): Promise<Collection> {
  assertPermission(canWriteFinances(actor.role), "Only Admin and Treasurer can record collections");
  const input = validateCollection(raw);
  const sb = await getSupabaseServer();
  const { data: receiptNumber, error: rpcErr } = await sb.rpc("next_receipt", { p_date: input.date });
  if (rpcErr || !receiptNumber) throw dbError(rpcErr, "Could not allocate a receipt number");
  const { data, error } = await sb
    .from("collections")
    .insert({
      receipt_number: receiptNumber,
      person_name: input.personName,
      phone: input.phone?.trim() || null,
      street: (input.category || input.street)?.trim() || "ஊர் வசூல்",
      amount: input.amount,
      payment_method: input.paymentMethod,
      contribution_type: input.contributionType === "namePhone" ? "name_phone" : input.contributionType,
      date: input.date,
      event_id: input.eventId || null,
      notes: input.notes?.trim() || null,
      created_by: actor.id,
      created_by_name: actor.name,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not save collection");
  invalidateDBCache();
  const rec = mapCollection(data);
  await log(sb, actor, {
    action: "added", entity: "collection", label: rec.personName,
    amount: rec.amount, eventName: await eventNameFor(sb, rec.eventId),
  });
  return rec;
}

export async function updateCollection(actor: DemoUser, id: string, raw: CollectionInput): Promise<Collection> {
  assertPermission(canWriteFinances(actor.role));
  const input = validateCollection(raw);
  const sb = await getSupabaseServer();
  const { data: existing, error: fetchErr } = await sb
    .from("collections").select("date, receipt_number").eq("id", id).maybeSingle();
  if (fetchErr || !existing) throw dbError(fetchErr, "Collection not found");

  let receiptNumber = existing.receipt_number;
  if (new Date(existing.date).getFullYear() !== new Date(input.date).getFullYear()) {
    const { data: next, error: rpcErr } = await sb.rpc("next_receipt", { p_date: input.date });
    if (rpcErr || !next) throw dbError(rpcErr, "Could not allocate a receipt number");
    receiptNumber = next;
  }
  const { data, error } = await sb
    .from("collections")
    .update({
      receipt_number: receiptNumber,
      person_name: input.personName,
      phone: input.phone?.trim() || null,
      street: (input.category || input.street)?.trim() || "ஊர் வசூல்",
      amount: input.amount,
      payment_method: input.paymentMethod,
      contribution_type: input.contributionType === "namePhone" ? "name_phone" : input.contributionType,
      date: input.date,
      event_id: input.eventId || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not update collection");
  invalidateDBCache();
  const rec = mapCollection(data);
  await log(sb, actor, {
    action: "edited", entity: "collection", label: rec.personName,
    amount: rec.amount, eventName: await eventNameFor(sb, rec.eventId),
  });
  return rec;
}

export async function deleteCollection(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteFinances(actor.role));
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb
    .from("collections").select("person_name, amount, event_id").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Collection not found");
  const { error } = await sb.from("collections").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete collection");
  invalidateDBCache();
  await log(sb, actor, {
    action: "deleted", entity: "collection", label: rec.person_name,
    amount: rec.amount, eventName: await eventNameFor(sb, rec.event_id),
  });
}

/* ── Expenses ─────────────────────────────────────────────── */

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
  assertPermission(canWriteFinances(actor.role), "Only Admin and Treasurer can record expenses");
  const input = validateExpense(raw);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("expenses")
    .insert({
      title: input.title,
      category: input.category,
      amount: input.amount,
      event_id: input.eventId || null,
      paid_by: input.paidBy,
      date: input.date,
      payment_method: input.paymentMethod,
      description: input.description?.trim() || null,
      bill_url: input.billUrl || null,
      created_by: actor.id,
      created_by_name: actor.name,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not save expense");
  invalidateDBCache();
  const rec = mapExpense(data);
  await log(sb, actor, {
    action: "added", entity: "expense", label: rec.title,
    amount: rec.amount, eventName: await eventNameFor(sb, rec.eventId),
  });
  return rec;
}

export async function updateExpense(actor: DemoUser, id: string, raw: ExpenseInput): Promise<Expense> {
  assertPermission(canWriteFinances(actor.role));
  const input = validateExpense(raw);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("expenses")
    .update({
      title: input.title,
      category: input.category,
      amount: input.amount,
      event_id: input.eventId || null,
      paid_by: input.paidBy,
      date: input.date,
      payment_method: input.paymentMethod,
      description: input.description?.trim() || null,
      bill_url: input.billUrl || null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not update expense");
  invalidateDBCache();
  const rec = mapExpense(data);
  await log(sb, actor, {
    action: "edited", entity: "expense", label: rec.title,
    amount: rec.amount, eventName: await eventNameFor(sb, rec.eventId),
  });
  return rec;
}

export async function deleteExpense(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteFinances(actor.role));
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb
    .from("expenses").select("title, amount, event_id").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Expense not found");
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete expense");
  invalidateDBCache();
  await log(sb, actor, {
    action: "deleted", entity: "expense", label: rec.title,
    amount: rec.amount, eventName: await eventNameFor(sb, rec.event_id),
  });
}

/* ── Events ───────────────────────────────────────────────── */

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
  assertPermission(canWriteEvents(actor.role), "Only Admin can create events");
  const input = validateEvent(raw);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("events")
    .insert({
      name: input.name,
      tamil_name: input.tamilName,
      type: input.type,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
      location: input.location,
      description: input.description,
      cover_url: input.cover || null,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not create event");
  const rec = mapEvent(data);
  await log(sb, actor, { action: "added", entity: "event", label: rec.name });
  return rec;
}

export async function updateEvent(actor: DemoUser, id: string, raw: EventInput): Promise<Event> {
  assertPermission(canWriteEvents(actor.role));
  const input = validateEvent(raw);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("events")
    .update({
      name: input.name,
      tamil_name: input.tamilName,
      type: input.type,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
      location: input.location,
      description: input.description,
      cover_url: input.cover || null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not update event");
  const rec = mapEvent(data);
  await log(sb, actor, { action: "edited", entity: "event", label: rec.name });
  return rec;
}

export async function deleteEvent(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role));
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb.from("events").select("name").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Event not found");
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete event");
  await log(sb, actor, { action: "deleted", entity: "event", label: rec.name });
}

/* ── Members ──────────────────────────────────────────────── */

function validateMember(input: MemberInput): Required<Omit<MemberInput, "photo">> & { photo?: string | null } {
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Member name is required");
  if (!input.phone?.trim()) throw new HttpError(400, "Phone number is required");
  if (input.phone.replace(/\D/g, "").length < 10) throw new HttpError(400, "Enter a valid 10-digit phone number");
  const joinedDate = input.joinedDate || todayISO();
  const role = input.role || "Member";
  const street = input.street?.trim() || "";
  return { ...input, name, phone: input.phone.trim(), street, role, joinedDate, photo: input.photo || null };
}

export async function createMember(actor: DemoUser, raw: MemberInput): Promise<Member> {
  assertPermission(canWriteMembers(actor.role), "Only Admin can manage members");
  const input = validateMember(raw);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("members")
    .insert({
      name: input.name,
      phone: input.phone.trim(),
      street: input.street,
      role: input.role,
      joined_date: input.joinedDate,
      photo_url: input.photo || null,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not add member");
  const rec = mapMember(data);
  await log(sb, actor, { action: "added", entity: "member", label: rec.name });
  return rec;
}

export async function updateMember(actor: DemoUser, id: string, raw: MemberInput): Promise<Member> {
  assertPermission(canWriteMembers(actor.role));
  const sb = await getSupabaseServer();
  const { data: existing } = await sb.from("members").select("*").eq("id", id).maybeSingle();
  const input = validateMember({
    ...raw,
    street: raw.street !== undefined ? raw.street : existing?.street,
    role: raw.role !== undefined ? raw.role : existing?.role,
    joinedDate: raw.joinedDate !== undefined ? raw.joinedDate : existing?.joined_date,
  });
  const { data, error } = await sb
    .from("members")
    .update({
      name: input.name,
      phone: input.phone.trim(),
      street: input.street,
      role: input.role,
      joined_date: input.joinedDate,
      photo_url: input.photo || null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not update member");
  const rec = mapMember(data);
  await log(sb, actor, { action: "edited", entity: "member", label: rec.name });
  return rec;
}

export async function deleteMember(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteMembers(actor.role));
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb.from("members").select("name").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Member not found");
  const { error } = await sb.from("members").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete member");
  await log(sb, actor, { action: "deleted", entity: "member", label: rec.name });
}

/* ── Games ────────────────────────────────────────────────── */

function validateGame(input: GameInput): Required<Pick<GameInput, "name">> & GameInput {
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Game name is required");
  return { ...input, name, tamilName: input.tamilName?.trim() || "" };
}

export async function createGame(actor: DemoUser, raw: GameInput): Promise<Game> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can create games");
  const input = validateGame(raw);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("games")
    .insert({
      event_id: input.eventId || null,
      name: input.name,
      tamil_name: input.tamilName,
      kind: input.kind,
      mode: gameModeOf(input.kind),
      status: input.status ?? "open",
      rules: input.rules?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not create game");
  const rec = mapGame(data);
  await log(sb, actor, {
    action: "added", entity: "game", label: rec.name, eventName: await eventNameFor(sb, rec.eventId),
  });
  return rec;
}

export async function updateGame(actor: DemoUser, id: string, raw: Partial<GameInput>): Promise<Game> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can edit games");
  const sb = await getSupabaseServer();
  const patch: Partial<Database["public"]["Tables"]["games"]["Row"]> = {};
  if (raw.name !== undefined) {
    const name = raw.name.trim();
    if (!name) throw new HttpError(400, "Game name is required");
    patch.name = name;
  }
  if (raw.tamilName !== undefined) patch.tamil_name = raw.tamilName.trim() || "";
  if (raw.kind !== undefined) {
    patch.kind = raw.kind;
    patch.mode = gameModeOf(raw.kind);
  }
  if (raw.status !== undefined) patch.status = raw.status;
  if (raw.rules !== undefined) patch.rules = raw.rules.trim() || null;
  if (raw.eventId !== undefined) patch.event_id = raw.eventId || null;

  const { data, error } = await sb.from("games").update(patch).eq("id", id).select("*").single();
  if (error || !data) throw dbError(error, "Could not update game");
  const rec = mapGame(data);
  await log(sb, actor, {
    action: "edited", entity: "game", label: rec.name, eventName: await eventNameFor(sb, rec.eventId),
  });
  return rec;
}

export async function deleteGame(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can delete games");
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb
    .from("games").select("name, event_id").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Game not found");
  const { error } = await sb.from("games").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete game");
  await log(sb, actor, {
    action: "deleted", entity: "game", label: rec.name, eventName: await eventNameFor(sb, rec.event_id),
  });
}

/* ── Teams ────────────────────────────────────────────────── */

async function requireTeamGame(sb: SB, gameId: string) {
  const { data: game, error } = await sb.from("games").select("id, mode, name").eq("id", gameId).maybeSingle();
  if (error || !game) throw new HttpError(404, "Game not found");
  if (game.mode !== "team") throw new HttpError(400, "This game is individual — teams aren't used");
  return game;
}

export async function createTeam(actor: DemoUser, input: TeamInput): Promise<Team> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can manage teams");
  const sb = await getSupabaseServer();
  const game = await requireTeamGame(sb, input.gameId);
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Team name is required");
  const { data: dup } = await sb.from("teams").select("id").eq("game_id", game.id).ilike("name", name);
  if (dup && dup.length > 0) throw new HttpError(400, "A team with this name already exists");
  const { data, error } = await sb
    .from("teams")
    .insert({ game_id: game.id, name, color: input.color || "saffron" })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not create team");
  const rec = mapTeam(data);
  await log(sb, actor, { action: "added", entity: "game", label: `Team “${name}” in ${game.name}` });
  return rec;
}

export async function updateTeam(actor: DemoUser, id: string, raw: Partial<TeamInput>): Promise<Team> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can manage teams");
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb
    .from("teams").select("id, name, game_id, color").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Team not found");
  const patch: Partial<Database["public"]["Tables"]["teams"]["Update"]> = {};
  const name = raw.name?.trim();
  if (name) {
    const { data: dup } = await sb.from("teams").select("id").eq("game_id", rec.game_id).ilike("name", name).neq("id", id);
    if (dup && dup.length > 0) throw new HttpError(400, "A team with this name already exists");
    patch.name = name;
  }
  if (raw.color) patch.color = raw.color;
  const { data, error } = await sb.from("teams").update(patch).eq("id", id).select("*").single();
  if (error || !data) throw dbError(error, "Could not update team");
  await log(sb, actor, { action: "edited", entity: "game", label: `Team “${data.name}”` });
  return mapTeam(data);
}

export async function deleteTeam(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can manage teams");
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb.from("teams").select("name").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Team not found");
  const { error } = await sb.from("teams").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete team");
  await log(sb, actor, { action: "deleted", entity: "game", label: `Team “${rec.name}”` });
}

/* ── Participants ─────────────────────────────────────────── */

export async function createParticipant(actor: DemoUser, input: ParticipantInput): Promise<Participant> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can manage participants");
  const name = input.name?.trim();
  if (!name) throw new HttpError(400, "Participant name is required");
  const sb = await getSupabaseServer();
  const { data: game, error: gameErr } = await sb.from("games").select("id, name").eq("id", input.gameId).maybeSingle();
  if (gameErr || !game) throw new HttpError(404, "Game not found");
  if (input.teamId) {
    const { data: team } = await sb.from("teams").select("id, game_id").eq("id", input.teamId).maybeSingle();
    if (!team || team.game_id !== game.id) throw new HttpError(400, "Team does not belong to this game");
  }
  const { data, error } = await sb
    .from("participants")
    .insert({
      game_id: game.id,
      team_id: input.teamId || null,
      member_id: input.memberId || null,
      name,
      phone: input.phone?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not add participant");
  const rec = mapParticipant(data);
  await log(sb, actor, { action: "added", entity: "game", label: `Participant ${rec.name} in ${game.name}` });
  return rec;
}

export async function deleteParticipant(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can manage participants");
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb.from("participants").select("name").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Participant not found");
  const { error } = await sb.from("participants").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete participant");
  await log(sb, actor, { action: "deleted", entity: "game", label: `Participant ${rec.name}` });
}

/* ── Matches ─────────────────────────────────────────────── */

async function ensureGameMatchTeams(sb: SB, gameId: string, teamAId: string, teamBId: string) {
  if (!teamAId || !teamBId || teamAId === teamBId) throw new HttpError(400, "Pick two different teams");
  const { data: teams } = await sb.from("teams").select("id").in("id", [teamAId, teamBId]).eq("game_id", gameId);
  if (!teams || teams.length !== 2) throw new HttpError(400, "Both teams must belong to this game");
}

function matchValues(input: MatchInput) {
  const scoreA = input.scoreA === undefined || input.scoreA === null ? null : Math.round(Number(input.scoreA));
  const scoreB = input.scoreB === undefined || input.scoreB === null ? null : Math.round(Number(input.scoreB));
  if (scoreA !== null && (!Number.isFinite(scoreA) || scoreA < 0)) throw new HttpError(400, "Score A must be 0 or more");
  if (scoreB !== null && (!Number.isFinite(scoreB) || scoreB < 0)) throw new HttpError(400, "Score B must be 0 or more");
  const hasScores = scoreA !== null && scoreB !== null;
  return {
    team_a_id: input.teamAId ?? null,
    team_b_id: input.teamBId ?? null,
    score_a: hasScores ? scoreA : null,
    score_b: hasScores ? scoreB : null,
    status: (hasScores ? "played" : "pending") as "played" | "pending",
    winner_team_id: hasScores ? (scoreA === scoreB ? null : (scoreA as number) > (scoreB as number) ? input.teamAId! : input.teamBId!) : null,
    played_at: hasScores ? input.playedAt || nowISO().slice(0, 10) : null,
    note: input.note?.trim() || null,
  };
}

async function bumpGameToOngoing(sb: SB, gameId: string) {
  const { data: game } = await sb.from("games").select("status").eq("id", gameId).maybeSingle();
  if (game?.status === "open") {
    await sb.from("games").update({ status: "ongoing" }).eq("id", gameId);
  }
}

export async function createMatch(actor: DemoUser, input: MatchInput): Promise<Match> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can record matches");
  const round = input.round?.trim();
  if (!round) throw new HttpError(400, "Round is required (e.g. Final)");
  const sb = await getSupabaseServer();
  await requireTeamGame(sb, input.gameId);
  await ensureGameMatchTeams(sb, input.gameId, input.teamAId ?? "", input.teamBId ?? "");
  const values = matchValues(input);
  const { data, error } = await sb
    .from("matches")
    .insert({ game_id: input.gameId, round, ...values })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not save match");
  await bumpGameToOngoing(sb, input.gameId);
  const rec = mapMatch(data);
  await log(sb, actor, {
    action: "added", entity: "game",
    label: values.status === "played" ? `${round} recorded` : `${round} scheduled`,
  });
  return rec;
}

export async function updateMatch(actor: DemoUser, id: string, raw: Partial<MatchInput>): Promise<Match> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can record matches");
  const sb = await getSupabaseServer();
  const { data: existing, error: fetchErr } = await sb
    .from("matches").select("id, game_id, round, team_a_id, team_b_id, score_a, score_b, note, played_at").eq("id", id).maybeSingle();
  if (fetchErr || !existing) throw dbError(fetchErr, "Match not found");
  const merged: MatchInput = {
    gameId: existing.game_id,
    round: raw.round ?? existing.round,
    teamAId: raw.teamAId !== undefined ? raw.teamAId : existing.team_a_id,
    teamBId: raw.teamBId !== undefined ? raw.teamBId : existing.team_b_id,
    scoreA: raw.scoreA !== undefined ? raw.scoreA : existing.score_a,
    scoreB: raw.scoreB !== undefined ? raw.scoreB : existing.score_b,
    note: raw.note !== undefined ? raw.note : existing.note ?? "",
    playedAt: raw.playedAt !== undefined ? raw.playedAt : existing.played_at,
  };
  const round = merged.round?.trim();
  if (!round) throw new HttpError(400, "Round is required (e.g. Final)");
  await requireTeamGame(sb, merged.gameId);
  await ensureGameMatchTeams(sb, merged.gameId, merged.teamAId ?? "", merged.teamBId ?? "");
  const values = matchValues(merged);
  const { data, error } = await sb
    .from("matches")
    .update({ round, ...values })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not update match");
  await bumpGameToOngoing(sb, merged.gameId);
  const rec = mapMatch(data);
  await log(sb, actor, { action: "edited", entity: "game", label: `${round} result` });
  return rec;
}

export async function deleteMatch(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can delete matches");
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb.from("matches").select("round").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Match not found");
  const { error } = await sb.from("matches").delete().eq("id", id);
  if (error) throw dbError(error, "Could not delete match");
  await log(sb, actor, { action: "deleted", entity: "game", label: `Match ${rec.round}` });
}

/* ── Game results / podium ───────────────────────────────── */

export async function setGameResults(
  actor: DemoUser, gameId: string, rows: GameResultInput[],
): Promise<GameResult[]> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can declare results");
  if (!Array.isArray(rows)) throw new HttpError(400, "Results must be an array");
  if (rows.length === 0) throw new HttpError(400, "Add at least one podium entry");
  const sb = await getSupabaseServer();
  const { data: game, error: gameErr } = await sb.from("games").select("id, name, event_id").eq("id", gameId).maybeSingle();
  if (gameErr || !game) throw new HttpError(404, "Game not found");

  const seen = new Set<number>();
  const toInsert: Database["public"]["Tables"]["game_results"]["Insert"][] = [];
  for (const r of rows) {
    if (r.position < 1 || r.position > 3 || !Number.isInteger(r.position))
      throw new HttpError(400, "Position must be 1, 2 or 3");
    if (seen.has(r.position)) throw new HttpError(400, `Position ${r.position} is used twice`);
    seen.add(r.position);
    if (r.kind === "team") {
      if (!r.teamId) throw new HttpError(400, "Pick the winning team");
      const { data: team } = await sb.from("teams").select("id, game_id").eq("id", r.teamId).maybeSingle();
      if (!team || team.game_id !== gameId) throw new HttpError(400, "Winner team must belong to this game");
    } else if (r.kind === "participant") {
      if (!r.participantId) throw new HttpError(400, "Pick the participant");
      const { data: p } = await sb.from("participants").select("id, game_id").eq("id", r.participantId).maybeSingle();
      if (!p || p.game_id !== gameId) throw new HttpError(400, "Participant must belong to this game");
    } else if (!r.label?.trim()) {
      throw new HttpError(400, "Title award needs a label (e.g. Best Batsman)");
    }
    toInsert.push({
      game_id: gameId,
      position: r.position as 1 | 2 | 3,
      kind: r.kind,
      team_id: r.kind === "team" ? r.teamId ?? null : null,
      participant_id: r.kind === "participant" ? r.participantId ?? null : null,
      label: r.label?.trim() || null,
      notes: r.note?.trim() || null,
    });
  }

  const { error: delErr } = await sb.from("game_results").delete().eq("game_id", gameId);
  if (delErr) throw dbError(delErr, "Could not replace previous results");
  const { data, error } = await sb.from("game_results").insert(toInsert).select("*");
  if (error || !data) throw dbError(error, "Could not declare results");
  await sb.from("games").update({ status: "results" }).eq("id", gameId);
  await log(sb, actor, {
    action: "added", entity: "game", label: `Results declared · ${game.name}`, eventName: await eventNameFor(sb, game.event_id),
  });
  return data.map(mapResult);
}

export async function clearGameResults(actor: DemoUser, gameId: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can manage results");
  const sb = await getSupabaseServer();
  const { data: game, error: gameErr } = await sb.from("games").select("id, name, event_id").eq("id", gameId).maybeSingle();
  if (gameErr || !game) throw new HttpError(404, "Game not found");
  const { error } = await sb.from("game_results").delete().eq("game_id", gameId);
  if (error) throw dbError(error, "Could not clear results");
  const { data: played } = await sb
    .from("matches").select("id").eq("game_id", gameId).eq("status", "played").limit(1);
  await sb.from("games").update({ status: played && played.length ? "ongoing" : "open" }).eq("id", gameId);
  await log(sb, actor, {
    action: "deleted", entity: "game", label: `Results cleared · ${game.name}`, eventName: await eventNameFor(sb, game.event_id),
  });
}

/* ── Gallery ──────────────────────────────────────────────── */

function validateGalleryUrl(url: string): string {
  const u = url.trim();
  const ok = u.startsWith("data:image/") || /^https?:\/\//i.test(u);
  if (!ok) throw new HttpError(400, "Image must be a http(s) URL or an uploaded image");
  if (u.length > 4_000_000) throw new HttpError(400, "Image is too large — keep photos under ~2.5 MB");
  return u;
}

export async function listGalleryPhotos(f: { eventId?: string } = {}): Promise<GalleryPhoto[]> {
  const sb = await getSupabaseServer();
  let query = sb.from("gallery").select("*").order("created_at", { ascending: false });
  if (f.eventId) query = query.eq("event_id", f.eventId);
  const { data, error } = await query;
  if (error) throw dbError(error, "Could not load gallery photos");
  return (data ?? []).map(mapGallery);
}

export async function createGalleryItem(actor: DemoUser, input: GalleryInput): Promise<GalleryPhoto> {
  if (!input.url) throw new HttpError(400, "Choose an image");
  const url = validateGalleryUrl(input.url);
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("gallery")
    .insert({
      event_id: input.eventId || null,
      url,
      caption: input.caption?.trim() || null,
      uploaded_by: actor.id,
      uploaded_by_name: actor.name,
    })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not upload photo");
  const rec = mapGallery(data);
  await log(sb, actor, {
    action: "added", entity: "gallery", label: rec.caption || "Photo", eventName: await eventNameFor(sb, rec.eventId),
  });
  invalidateDBCache();
  return rec;
}

export async function deleteGalleryItem(actor: DemoUser, id: string): Promise<void> {
  assertPermission(canWriteEvents(actor.role), "Only Admin can remove photos");
  const sb = await getSupabaseServer();
  const { data: rec, error: fetchErr } = await sb
    .from("gallery").select("caption, event_id").eq("id", id).maybeSingle();
  if (fetchErr || !rec) throw dbError(fetchErr, "Photo not found");
  const { error } = await sb.from("gallery").delete().eq("id", id);
  if (error) throw dbError(error, "Could not remove photo");
  await log(sb, actor, {
    action: "deleted", entity: "gallery", label: rec.caption || "Photo", eventName: await eventNameFor(sb, rec.event_id),
  });
  invalidateDBCache();
}

/* ── Settings ─────────────────────────────────────────────── */

export async function setSettings(
  actor: DemoUser,
  patch: Partial<{ publicView: boolean }>,
): Promise<{ publicView: boolean }> {
  assertPermission(canManageSettings(actor.role), "Only Admin can change settings");
  if (typeof patch.publicView !== "boolean") {
    throw new HttpError(400, "publicView must be a boolean");
  }
  const sb = await getSupabaseServer();
  const { data, error } = await sb
    .from("settings")
    .update({ public_view: patch.publicView })
    .eq("id", true)
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "Could not update settings");
  await log(sb, actor, {
    action: "edited", entity: "settings",
    label: `Public view ${data.public_view ? "enabled" : "disabled"}`,
  });
  return { publicView: data.public_view };
}

