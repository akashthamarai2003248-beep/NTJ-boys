"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarDays, Crown, Medal, Pencil, Plus, Swords, Trash2, Trophy, UserRound, Users,
} from "lucide-react";
import type {
  Event, Game, GameInput, GameResult, GameResultInput, Match, MatchInput,
  Participant, ParticipantInput, Team, TeamInput,
} from "@/lib/data/types";
import { MATCH_ROUNDS, TEAM_COLORS } from "@/lib/data/types";
import type { GameDetail, PodiumRow } from "@/lib/data/repository";
import { api } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { usePermissions } from "@/components/layout/session";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatShort } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { GameForm } from "./GameForm";
import { GameStatusPill, gameKindMeta, teamStyle, TEAM_STYLES } from "./meta";

type Tab = "teams" | "players" | "matches" | "podium";

export function GameDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const admin = can.events;

  const { data, loading, error, reload } = useFetch<{ game: GameDetail }>(`/api/games/${id}`);
  const game = data?.game ?? null;

  const [tab, setTab] = useState<Tab>(game?.mode === "individual" ? "players" : "teams");

  /* modals */
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teamModal, setTeamModal] = useState<{ open: boolean; editing: Team | null }>({ open: false, editing: null });
  const [playerModal, setPlayerModal] = useState(false);
  const [matchModal, setMatchModal] = useState<{ open: boolean; editing: Match | null }>({ open: false, editing: null });
  const [resultsOpen, setResultsOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const eventsFetch = useFetch<{ events: Event[] }>("/api/events");
  const events = eventsFetch.data?.events ?? [];
  const membersFetch = useFetch<{ members: (import("@/lib/data/types").Member)[] }>("/api/members");
  const members = membersFetch.data?.members ?? [];

  if (error) {
    return (
      <div className="card-surface rounded-2xl">
        <EmptyState icon={Trophy} title="Game not found" message={error} action={
          <Link href="/games"><Button variant="secondary">Back to Games</Button></Link>
        } />
      </div>
    );
  }

  if (loading && !game) {
    return <div className="space-y-4"><Skeleton className="h-44 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }
  if (!game) return null;

  const meta = gameKindMeta(game.kind);
  const teamMode = game.mode === "team";
  const teams = game.teams;
  const participants = game.participants;
  const matches = game.matches;
  const podium = game.podium;
  const teamName = (tid?: string | null) => teams.find((t) => t.id === tid)?.name ?? "—";

  const doEdit = async (input: GameInput) => {
    setBusy(true);
    setFormError(null);
    try {
      await api.patch(`/api/games/${game.id}`, input);
      toast.success("Game updated");
      setEditOpen(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await api.del(`/api/games/${game.id}`);
      toast.success("Game removed");
      router.push("/games");
    } catch (e) {
      toast.error((e as Error).message);
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const addTeam = async (input: TeamInput) => {
    setBusy(true);
    setFormError(null);
    try {
      await api.post("/api/teams", input);
      toast.success(`Team “${input.name}” added`);
      setTeamModal({ open: false, editing: null });
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editTeam = async (input: TeamInput) => {
    if (!teamModal.editing) return;
    setBusy(true);
    setFormError(null);
    try {
      await api.patch(`/api/teams/${teamModal.editing.id}`, input);
      toast.success("Team updated");
      setTeamModal({ open: false, editing: null });
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async (t: Team) => {
    setBusy(true);
    try {
      await api.del(`/api/teams/${t.id}`);
      toast.success(`Team “${t.name}” removed`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addPlayer = async (input: ParticipantInput) => {
    setBusy(true);
    setFormError(null);
    try {
      await api.post("/api/participants", input);
      toast.success(`${input.name} registered`);
      setPlayerModal(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removePlayer = async (p: Participant) => {
    setBusy(true);
    try {
      await api.del(`/api/participants/${p.id}`);
      toast.success(`${p.name} removed`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveMatch = async (input: MatchInput) => {
    setBusy(true);
    setFormError(null);
    try {
      if (matchModal.editing) {
        await api.patch(`/api/matches/${matchModal.editing.id}`, input);
        toast.success("Match updated");
      } else {
        await api.post("/api/matches", input);
        toast.success(input.scoreA !== null && input.scoreB !== null ? "Result recorded" : "Match scheduled");
      }
      setMatchModal({ open: false, editing: null });
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeMatch = async (m: Match) => {
    setBusy(true);
    try {
      await api.del(`/api/matches/${m.id}`);
      toast.success("Match removed");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveResults = async (rows: GameResultInput[]) => {
    setBusy(true);
    setFormError(null);
    try {
      const res = await api.put<{ results: unknown[] }>(`/api/games/${game.id}/results`, { results: rows });
      toast.success(`Podium saved — ${res.results.length} position${res.results.length === 1 ? "" : "s"}`);
      setResultsOpen(false);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clearResults = async () => {
    setBusy(true);
    try {
      await api.del(`/api/games/${game.id}/results`);
      toast.success("Results cleared — game reopened");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hasResults = podium.length > 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <Link href="/games" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> All games
      </Link>

      {/* hero */}
      <div className="relative overflow-hidden rounded-2xl border border-line shadow-card">
        <div className="brand-gradient brand-aurora relative px-5 pb-5 pt-6 text-white sm:px-7 sm:pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <GameStatusPill status={game.status} />
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                  {meta.emoji} {meta.label}
                </span>
                {game.event && (
                  <Link href={`/events/${game.event.id}`} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur transition-colors hover:bg-white/25">
                    <CalendarDays className="size-3" /> {game.event.name}
                  </Link>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-4xl drop-shadow-sm sm:text-5xl">{meta.emoji}</span>
                <div>
                  <h1 className="text-[24px] font-black leading-none tracking-tight drop-shadow-sm sm:text-[30px]">
                    {game.name}
                  </h1>
                  <p className="mt-1.5 text-[13.5px] font-semibold text-saffron-200">
                    {game.tamilName || meta.ta} · நேதாஜி பாய்ஸ் மன்றம்
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {admin && (
                <>
                  <Button size="sm" variant="secondary" className="border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white" onClick={() => { setFormError(null); setEditOpen(true); }}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  {teamMode ? (
                    teams.length >= 2 && (
                      <Button size="sm" className="bg-saffron-500 text-white hover:bg-saffron-600" onClick={() => setMatchModal({ open: true, editing: null })}>
                        <Swords className="size-3.5" /> New Match
                      </Button>
                    )
                  ) : null}
                  <Button size="sm" className="bg-gold-500 text-navy-950 hover:bg-gold-600" onClick={() => { setFormError(null); setResultsOpen(true); }}>
                    <Medal className="size-3.5" /> {hasResults ? "Edit Results" : "Declare Results"}
                  </Button>
                </>
              )}
            </div>
          </div>
          {game.rules ? (
            <p className="mt-4 max-w-2xl text-[12.5px] font-medium leading-relaxed text-navy-100/90">
              {game.rules}
            </p>
          ) : null}
        </div>
      </div>

      {/* stat strip */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Stat label={teamMode ? "Teams" : "Registered"} ta={teamMode ? "அணிகள்" : "பதிவு"} value={String(teamMode ? teams.length : participants.length)} icon={Users} tone="bg-white/10 text-saffron-300" />
        <Stat label="Players" ta="வீரர்கள்" value={String(participants.length)} icon={UserRound} tone="bg-white/10 text-saffron-300" />
        <Stat label={teamMode ? "Matches played" : "Status"} ta={teamMode ? "ஆட்டங்கள்" : "நிலை"} value={teamMode ? `${matches.filter((m) => m.status === "played").length}` : game.status} icon={Swords} tone="bg-white/10 text-saffron-300" />
      </div>

      {/* tabs */}
      <div className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {(
          teamMode
            ? [
                { id: "teams" as Tab, label: "Teams", ta: "அணிகள்", icon: Users },
                { id: "players" as Tab, label: "Players", ta: "வீரர்கள்", icon: UserRound },
                { id: "matches" as Tab, label: "Matches", ta: "ஆட்டங்கள்", icon: Swords },
                { id: "podium" as Tab, label: "Results", ta: "முடிவுகள்", icon: Medal },
              ]
            : [
                { id: "players" as Tab, label: "Players", ta: "வீரர்கள்", icon: UserRound },
                { id: "podium" as Tab, label: "Results", ta: "முடிவுகள்", icon: Medal },
              ]
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-bold transition-colors",
                active ? "text-navy-900 dark:text-white" : "text-muted hover:text-ink",
              )}
            >
              <t.icon className={cn("size-4", active ? "text-saffron-600" : "text-faint")} />
              {t.label}
              <span className={cn("text-[11px] font-semibold", active ? "text-saffron-600" : "text-faint")}>{t.ta}</span>
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-saffron-500" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "teams" && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <p className="text-[14px] font-extrabold">Teams · அணிகள் <span className="ml-1 text-[11.5px] font-semibold text-faint">{teams.length} registered</span></p>
            {admin && (
              <Button size="sm" onClick={() => { setFormError(null); setTeamModal({ open: true, editing: null }); }}>
                <Plus className="size-3.5" /> Add Team
              </Button>
            )}
          </div>
          {teams.length === 0 ? (
            <EmptyState icon={Users} title="No teams yet" message="Add teams to start the competition — each team gets its own colour." action={admin ? <Button variant="primary" onClick={() => setTeamModal({ open: true, editing: null })}><Plus className="size-4" /> Add Team</Button> : undefined} />
          ) : (
            <div className="divide-y divide-line">
              {teams.map((t, i) => {
                const st = teamStyle(t.color);
                const count = participants.filter((p) => p.teamId === t.id).length;
                return (
                  <div key={t.id} className="flex items-center gap-3.5 px-5 py-3.5">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-black text-white shadow-inner", st.dot)}>
                      {String(i + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-extrabold">{t.name}</p>
                      <p className="text-[11.5px] font-medium text-muted">{count} player{count === 1 ? "" : "s"} · {TEAM_COLORS.find((c) => c.value === t.color)?.label.split(" · ")[0]}</p>
                    </div>
                    {admin ? (
                      <div className="flex gap-1">
                        <button aria-label={`Edit ${t.name}`} onClick={() => { setFormError(null); setTeamModal({ open: true, editing: t }); }} className="rounded-lg p-2 text-faint transition-colors hover:bg-surface-2 hover:text-ink"><Pencil className="size-4" /></button>
                        <button aria-label={`Delete ${t.name}`} onClick={() => { void removeTeam(t); }} className="rounded-lg p-2 text-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "players" && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <p className="text-[14px] font-extrabold">{teamMode ? "Players · வீரர்கள்" : "Participants · பங்கேற்பாளர்கள்"} <span className="ml-1 text-[11.5px] font-semibold text-faint">{participants.length}</span></p>
            {admin && (
              <Button size="sm" onClick={() => { setFormError(null); setPlayerModal(true); }}>
                <Plus className="size-3.5" /> {teamMode ? "Add Player" : "Add Participant"}
              </Button>
            )}
          </div>
          {participants.length === 0 ? (
            <EmptyState icon={UserRound} title={teamMode ? "No players yet" : "No participants yet"} message="Register the first player — names can be picked from your member list." action={admin ? <Button variant="primary" onClick={() => setPlayerModal(true)}><Plus className="size-4" /> Register</Button> : undefined} />
          ) : (
            <div className="grid gap-x-4 md:grid-cols-2">
              {participants.map((p) => {
                const t = teamMode && p.teamId ? teams.find((x) => x.id === p.teamId) : null;
                const st = t ? teamStyle(t.color) : null;
                const isMember = members.some((m) => m.id === p.memberId);
                return (
                  <div key={p.id} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 md:border-b-0 md:px-3">
                    <Avatar name={p.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{p.name}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {t ? <Badge tone="muted" className="px-1.5 py-0 text-[10px]"><span className={cn("mr-1 inline-block size-1.5 rounded-full", st!.dot)} />{t.name}</Badge> : null}
                        {isMember ? <Badge tone="navy" className="px-1.5 py-0 text-[10px]">Member</Badge> : null}
                      </div>
                    </div>
                    {admin && (
                      <button aria-label={`Remove ${p.name}`} onClick={() => { void removePlayer(p); }} className="rounded-lg p-2 text-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "matches" && (
        <section className="card-surface overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <p className="text-[14px] font-extrabold">Matches · ஆட்டங்கள் <span className="ml-1 text-[11.5px] font-semibold text-faint">{matches.filter((m) => m.status === "played").length} played</span></p>
            {admin && (
              <Button size="sm" onClick={() => { setFormError(null); setMatchModal({ open: true, editing: null }); }}>
                <Plus className="size-3.5" /> New Match
              </Button>
            )}
          </div>
          {matches.length === 0 ? (
            <EmptyState icon={Swords} title="No matches yet" message="Schedule the first fixture — record scores to decide who advances." action={admin ? <Button variant="primary" onClick={() => setMatchModal({ open: true, editing: null })}><Swords className="size-4" /> Schedule match</Button> : undefined} />
          ) : (
            <div className="divide-y divide-line">
              {matches.map((m) => {
                const played = m.status === "played";
                const aStyle = teamStyle(teams.find((t) => t.id === m.teamAId)?.color ?? "saffron");
                const bStyle = teamStyle(teams.find((t) => t.id === m.teamBId)?.color ?? "saffron");
                return (
                  <div key={m.id} className="px-5 py-4">
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <Badge tone={played ? "navy" : "muted"}>{m.round}</Badge>
                      {played ? (
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-leaf-700 dark:text-leaf-400">
                          <Crown className="size-3.5" /> {teamName(m.winnerTeamId)} {m.winnerTeamId ? "won" : "· drew"}
                        </span>
                      ) : (
                        <span className="text-[11.5px] font-bold text-faint">Scheduled{m.playedAt ? ` · ${formatShort(m.playedAt)}` : ""}</span>
                      )}
                      {admin && (
                        <span className="ml-auto flex gap-1">
                          <button aria-label="Edit match" onClick={() => { setFormError(null); setMatchModal({ open: true, editing: m }); }} className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface-2 hover:text-ink"><Pencil className="size-4" /></button>
                          <button aria-label="Delete match" onClick={() => { void removeMatch(m); }} className="rounded-lg p-1.5 text-faint transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="size-4" /></button>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <MatchTeam name={teamName(m.teamAId)} color={aStyle} score={m.scoreA} won={played && m.winnerTeamId === m.teamAId} align="right" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-faint">vs</span>
                      <MatchTeam name={teamName(m.teamBId)} color={bStyle} score={m.scoreB} won={played && m.winnerTeamId === m.teamBId} align="left" />
                    </div>
                    {m.note ? <p className="mt-2 text-center text-[11.5px] font-medium text-muted">{m.note}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "podium" && (
        <section className="space-y-4">
          {hasResults ? (
            <>
              <div className="card-surface overflow-hidden rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                  <p className="flex items-center gap-2 text-[14px] font-extrabold"><Medal className="size-4 text-gold-500" /> Winners · வெற்றியாளர்கள்</p>
                  {admin && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => { setFormError(null); setResultsOpen(true); }}><Pencil className="size-3.5" /> Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => setClearOpen(true)}><Trash2 className="size-3.5" /> Clear</Button>
                    </div>
                  )}
                </div>
                <Podium podium={podium} />
              </div>
              <GameResultNote game={game} />
            </>
          ) : (
            <div className="card-surface rounded-2xl">
              <EmptyState
                icon={Medal}
                tone="gold"
                title="No results yet"
                message="When the competition ends, declare the winners — the podium shows 1st, 2nd and 3rd with an animated reveal."
                action={admin ? (
                  <Button variant="primary" onClick={() => { setFormError(null); setResultsOpen(true); }}>
                    <Medal className="size-4" /> Declare Results
                  </Button>
                ) : undefined}
              />
            </div>
          )}
        </section>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => { if (!busy) setEditOpen(false); }} title="Edit Game" description={game.name} maxWidth="max-w-xl">
        <GameForm events={events} initial={game} submitting={busy} error={formError} onSubmit={doEdit} onCancel={() => setEditOpen(false)} />
      </Modal>

      {/* Team modal */}
      <Modal open={teamModal.open} onClose={() => { if (!busy) setTeamModal({ open: false, editing: null }); }} title={teamModal.editing ? "Edit Team" : "Add Team"} description={teamModal.editing ? teamModal.editing.name : `New team in ${game.name}`} maxWidth="max-w-md">
        <TeamForm
          gameId={game.id}
          initial={teamModal.editing}
          submitting={busy}
          error={formError}
          onSubmit={teamModal.editing ? editTeam : addTeam}
          onCancel={() => setTeamModal({ open: false, editing: null })}
        />
      </Modal>

      {/* Participant modal */}
      <Modal open={playerModal} onClose={() => { if (!busy) setPlayerModal(false); }} title={teamMode ? "Add Player" : "Add Participant"} description={teamMode ? "Pick a member or type a guest name" : "Register a runner / player"} maxWidth="max-w-md">
        <PlayerForm
          gameId={game.id}
          teams={teams}
          teamMode={teamMode}
          members={members}
          submitting={busy}
          error={formError}
          onSubmit={addPlayer}
          onCancel={() => setPlayerModal(false)}
        />
      </Modal>

      {/* Match modal */}
      <Modal open={matchModal.open} onClose={() => { if (!busy) setMatchModal({ open: false, editing: null }); }} title={matchModal.editing ? "Edit Match" : "New Match"} description={`${game.name} · ${matchModal.editing?.round ?? "fixture"}`} maxWidth="max-w-md">
        <MatchForm
          teams={teams}
          initial={matchModal.editing}
          submitting={busy}
          error={formError}
          onSubmit={saveMatch}
          onCancel={() => setMatchModal({ open: false, editing: null })}
        />
      </Modal>

      {/* Results modal */}
      <Modal open={resultsOpen} onClose={() => { if (!busy) setResultsOpen(false); }} title="Declare Results" description={`${game.name} — 1st, 2nd, 3rd`} maxWidth="max-w-xl">
        <ResultsForm
          game={game}
          teams={teams}
          participants={participants}
          initial={game.results}
          submitting={busy}
          error={formError}
          onSubmit={saveResults}
          onCancel={() => setResultsOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={async () => { await clearResults(); setClearOpen(false); }}
        loading={busy}
        title="Clear results?"
        body="The podium is removed and the game reopens for more play."
        confirmLabel="Clear podium"
      />

      {/* Delete game */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={doDelete}
        loading={busy}
        title="Delete this game?"
        body={<>“<b>{game.name}</b>” and all its teams, players and results will be removed permanently.</>}
        confirmLabel="Delete game"
      />

      {admin && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5" /> Delete game
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── small presentational pieces ─────────────────────────────── */

function Stat({ label, ta, value, icon: Icon, tone }: { label: string; ta: string; value: string; icon: typeof Users; tone: string }) {
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-navy-800 to-navy-950 px-3.5 py-3 text-white sm:px-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-lg sm:size-8", tone)}><Icon className="size-4" /></span>
        <div className="min-w-0">
          <p className="truncate text-[10.5px] font-bold uppercase tracking-wide text-navy-100/80">{label} · {ta}</p>
          <p className="truncate text-[17px] font-black leading-tight tabular-nums sm:text-[19px]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MatchTeam({ name, color, score, won, align }: { name: string; color: { dot: string; hex: string }; score: number | null | undefined; won?: boolean; align: "left" | "right" }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", align === "right" ? "justify-end text-right" : "justify-start text-left")}>
      <span className={cn("size-2.5 shrink-0 rounded-full", color.dot)} />
      <div className="min-w-0">
        <p className={cn("truncate text-[13.5px] font-extrabold", won ? "text-leaf-700 dark:text-leaf-400" : "")}>{name}</p>
      </div>
      {score !== null && score !== undefined ? (
        <span className={cn("rounded-lg bg-surface-2 px-2 py-0.5 text-[14px] font-black tabular-nums", won ? "text-leaf-700 dark:text-leaf-400" : "")}>{score}</span>
      ) : null}
    </div>
  );
}

function GameResultNote({ game }: { game: GameDetail }) {
  if (game.mode === "team" && game.matches.length === 0) {
    return (
      <p className="rounded-xl border border-gold-200 bg-gold-100/50 px-4 py-3 text-[12px] font-medium leading-relaxed text-gold-800 dark:border-gold-400/25 dark:bg-gold-400/10 dark:text-gold-200">
        Results were declared without recorded matches. Add fixtures to keep the tournament history complete.
      </p>
    );
  }
  return null;
}

/* ── Podium ──────────────────────────────────────────────────── */

export function Podium({ podium }: { podium: PodiumRow[] }) {
  const byPos = new Map(podium.map((p) => [p.position, p]));
  const rankOf = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" } as const;
  const cols = [
    { slot: 2 as const, h: "h-24", medal: "🥈", order: 1 },
    { slot: 1 as const, h: "h-32", medal: "🥇", order: 0 },
    { slot: 3 as const, h: "h-20", medal: "🥉", order: 2 },
  ];
  return (
    <div className="px-4 pb-6 pt-8 sm:px-8">
      <div className="mx-auto flex max-w-2xl items-end justify-center gap-2 sm:gap-4">
        {cols.map((c) => {
          const row = byPos.get(c.slot);
          return (
            <div key={c.slot} className={cn("flex w-1/3 flex-col items-center gap-2", c.order === 0 ? "z-10" : "")}>
              {row ? (
                <div className={cn(
                  "flex w-full flex-col items-center rounded-t-2xl border border-b-0 px-2 pt-4 text-center transition-transform",
                  c.h,
                  c.slot === 1
                    ? "border-gold-300 bg-gradient-to-b from-gold-200 to-gold-400/80 text-gold-900 shadow-[0_-6px_24px_-8px_rgba(217,161,40,0.5)] dark:from-gold-400/25 dark:to-gold-500/10 dark:text-gold-200 dark:border-gold-400/40"
                    : c.slot === 2
                      ? "border-slate-300 bg-gradient-to-b from-slate-100 to-slate-300/70 text-slate-800 dark:from-slate-400/20 dark:to-slate-500/10 dark:text-slate-200 dark:border-slate-400/40"
                      : "border-amber-700/40 bg-gradient-to-b from-amber-100 to-amber-500/70 text-amber-900 dark:from-amber-500/20 dark:to-amber-600/10 dark:text-amber-200",
                )}
                >
                  <div className="w-full">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{c.slot === 1 ? "Champion" : c.slot === 2 ? "Runner-up" : "Third"}</p>
                    {row.color && row.kind === "team" ? (
                      <span className={cn("mx-auto mt-1 block size-3 rounded-full", TEAM_STYLES[row.color]?.dot)} />
                    ) : null}
                    <p className="mt-1.5 line-clamp-2 text-[12.5px] font-extrabold leading-tight">{row.name}</p>
                    <p className="mt-1 line-clamp-1 text-[9.5px] font-semibold uppercase tracking-wide opacity-60">{row.subtitle}</p>
                  </div>
                </div>
              ) : (
                <div className={cn("flex w-full items-center justify-center rounded-t-2xl border border-dashed border-b-0 border-line-strong text-faint", c.h)}>
                  <span className="text-[11px] font-bold opacity-50">—</span>
                </div>
              )}
              <span className="text-2xl sm:text-3xl">{c.medal}</span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-faint">{rankOf[c.slot]} · {row?.ta ?? ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Forms ───────────────────────────────────────────────────── */

function TeamForm({
  gameId, initial, submitting, error, onSubmit, onCancel,
}: {
  gameId: string;
  initial: Team | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: TeamInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "saffron");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ gameId, name, color });
      }}
      className="space-y-4"
    >
      <Field label="Team name" ta="அணியின் பெயர்" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="North Street Bulls" autoFocus />
      </Field>
      <Field label="Team colour" ta="அணி நிறம்">
        <div className="flex flex-wrap gap-2">
          {TEAM_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              aria-label={c.label}
              title={c.label}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-all",
                color === c.value ? "border-navy-400 bg-surface-2 shadow-[0_0_0_1px] shadow-navy-400/50" : "border-line text-muted hover:border-line-strong",
              )}
            >
              <span className={cn("size-3 rounded-full", c.swatch)} />
              {c.label.split(" · ")[0]}
            </button>
          ))}
        </div>
      </Field>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={submitting}>{initial ? "Save" : "Add team"}</Button>
      </div>
    </form>
  );
}

function PlayerForm({
  gameId, teams, teamMode, members, submitting, error, onSubmit, onCancel,
}: {
  gameId: string;
  teams: Team[];
  teamMode: boolean;
  members: import("@/lib/data/types").Member[];
  submitting: boolean;
  error: string | null;
  onSubmit: (input: ParticipantInput) => void;
  onCancel: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [teamId, setTeamId] = useState(teamMode ? teams[0]?.id ?? "" : "");
  const pickMember = (id: string) => {
    setMemberId(id);
    const m = members.find((x) => x.id === id);
    if (m) {
      setName(m.name);
      setPhone(m.phone);
      if (teamMode) setTeamId((prev) => prev || teams[0]?.id || "");
    }
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({ gameId, teamId: teamMode ? teamId || null : null, memberId: memberId || null, name, phone });
      }}
      className="space-y-4"
    >
      <Field label="Pick a member (optional)" ta="உறுப்பினரைத் தேர்ந்தெடுக்கவும்">
        <Select value={memberId} onChange={(e) => pickMember(e.target.value)}>
          <option value="">Guest — not a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" ta="பெயர்" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Kumar" autoFocus />
        </Field>
        <Field label="Phone (optional)" ta="தொலைபேசி">
          <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="9840010001" inputMode="numeric" />
        </Field>
      </div>
      {teamMode ? (
        <Field label="Team" ta="அணி">
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">No team yet</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </Field>
      ) : null}
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={submitting}>Register</Button>
      </div>
    </form>
  );
}

function MatchForm({
  teams, initial, submitting, error, onSubmit, onCancel,
}: {
  teams: Team[];
  initial: Match | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: MatchInput) => void;
  onCancel: () => void;
}) {
  const [round, setRound] = useState(initial?.round ?? "League");
  const [teamAId, setTeamAId] = useState(initial?.teamAId ?? teams[0]?.id ?? "");
  const [teamBId, setTeamBId] = useState(initial?.teamBId ?? teams[1]?.id ?? teams[0]?.id ?? "");
  const [scoreA, setScoreA] = useState(initial?.scoreA != null ? String(initial.scoreA) : "");
  const [scoreB, setScoreB] = useState(initial?.scoreB != null ? String(initial.scoreB) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [playedAt, setPlayedAt] = useState(initial?.playedAt ?? new Date().toISOString().slice(0, 10));

  const submit = () => {
    onSubmit({
      gameId: initial?.gameId ?? teams[0]?.gameId ?? "",
      round,
      teamAId: teamAId || null,
      teamBId: teamBId || null,
      scoreA: scoreA === "" ? null : Number(scoreA),
      scoreB: scoreB === "" ? null : Number(scoreB),
      note,
      playedAt,
    });
  };
  const scoreAId = teams.find((t) => t.id === teamAId)?.id;
  const scoreBId = teams.find((t) => t.id === teamBId)?.id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Round" ta="சுற்று">
          <Select value={round} onChange={(e) => setRound(e.target.value)}>
            {MATCH_ROUNDS.map((r) => <option key={r} value={r}>{r}</option>)}
            {!MATCH_ROUNDS.includes(round as never) && round ? <option value={round}>{round}</option> : null}
          </Select>
        </Field>
        <Field label="Date played" ta="தேதி">
          <Input type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <Field label="Team A" ta="அணி A">
          <Select value={teamAId} onChange={(e) => setTeamAId(e.target.value)}>
            {teams.filter((t) => t.id !== teamBId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Team B" ta="அணி B">
          <Select value={teamBId} onChange={(e) => setTeamBId(e.target.value)}>
            {teams.filter((t) => t.id !== teamAId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <Field label={`Score ${teams.find((t) => t.id === teamAId)?.name ?? "A"}`} ta="புள்ளிகள்">
          <Input inputMode="numeric" value={scoreA} onChange={(e) => setScoreA(e.target.value.replace(/\D/g, ""))} placeholder="runs / goals" />
        </Field>
        <Field label={`Score ${teams.find((t) => t.id === teamBId)?.name ?? "B"}`} ta="புள்ளிகள்">
          <Input inputMode="numeric" value={scoreB} onChange={(e) => setScoreB(e.target.value.replace(/\D/g, ""))} placeholder="runs / goals" />
        </Field>
      </div>
      <p className="-mt-1 text-[11.5px] font-medium text-faint">Leave scores empty to schedule; add both to record the result. {scoreAId === scoreBId && scoreAId ? "Pick two different teams." : ""}</p>
      <Field label="Note (optional)" ta="குறிப்பு">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Won by 3 wickets…" />
      </Field>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={submitting} onClick={submit}>
          {initial ? "Save match" : (scoreA !== "" && scoreB !== "" ? "Record result" : "Schedule match")}
        </Button>
      </div>
    </div>
  );
}

function ResultsForm({
  game, teams, participants, initial, submitting, error, onSubmit, onCancel,
}: {
  game: Game;
  teams: Team[];
  participants: Participant[];
  initial: GameResult[];
  submitting: boolean;
  error: string | null;
  onSubmit: (rows: GameResultInput[]) => void;
  onCancel: () => void;
}) {
  const defaults: { position: 1 | 2 | 3; kind: "team" | "participant" | "title"; refId: string; label: string; note: string }[] = [1, 2, 3].map((pos) => {
    const ex = initial.find((r) => r.position === pos);
    return {
      position: pos as 1 | 2 | 3,
      kind: ex?.kind ?? "team",
      refId: ex?.kind === "team" ? (ex.teamId ?? "") : ex?.kind === "participant" ? (ex.participantId ?? "") : "",
      label: ex?.label ?? "",
      note: ex?.note ?? "",
    };
  });
  const [rows, setRows] = useState(defaults);

  const options = game.mode === "team"
    ? teams.map((t) => ({ value: t.id, label: t.name, kind: "team" as const }))
    : participants.map((p) => ({ value: p.id, label: p.name, kind: "participant" as const }));

  const set = (pos: number, patch: Partial<(typeof defaults)[number]>) => {
    setRows((prev) => prev.map((r) => (r.position === pos ? { ...r, ...patch } : r)));
  };

  const valid = rows.filter((r) => (r.kind === "title" ? r.label.trim() : r.refId)).length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.position} className="rounded-xl border border-line bg-surface-2/60 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-lg shadow-[0_1px_2px_rgba(10,16,30,0.08)]">
                {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : "🥉"}
              </span>
              <Select
                value={r.kind}
                onChange={(e) => {
                  const kind = e.target.value as typeof r.kind;
                  set(r.position, { kind, refId: "", label: r.label, note: r.note });
                }}
                className="min-w-0 flex-1"
                aria-label={`Position ${r.position} kind`}
              >
                <option value="team">{game.mode === "team" ? "Team" : "—"}</option>
                <option value="participant">{game.mode === "team" ? "Player" : "Participant"}</option>
                <option value="title">Special award · சிறப்பு பரிசு</option>
              </Select>
              {r.kind !== "title" ? (
                <Select
                  value={r.refId}
                  onChange={(e) => set(r.position, { refId: e.target.value })}
                  className="min-w-0 flex-1"
                  aria-label={`Position ${r.position} winner`}
                >
                  <option value="">Choose…</option>
                  {options
                    .filter((o) => o.kind === (r.kind === "participant" ? "participant" : "team"))
                    .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input value={r.label} onChange={(e) => set(r.position, { label: e.target.value })} placeholder="e.g. Best Batsman · சிறந்த ஆட்டக்காரர்" className="min-w-0 flex-1" />
              )}
            </div>
            {r.kind === "title" ? (
              <Input value={r.note} onChange={(e) => set(r.position, { note: e.target.value })} placeholder="Winner name / note (optional)" className="mt-2.5" />
            ) : (
              <Input value={r.note} onChange={(e) => set(r.position, { note: e.target.value })} placeholder={`Note · ${r.position === 1 ? "Champions · வாகையாளர்கள்" : r.position === 2 ? "Runners-up" : "Third place"} (optional)`} className="mt-2.5" />
            )}
          </div>
        ))}
      </div>
      <p className="text-[12px] font-medium leading-relaxed text-muted">
        Saving declares the podium — for team games pick teams; for individual games pick players. Add a note like <i>Champions · வாகையாளர்கள்</i> to label the trophy.
      </p>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-[11.5px] font-bold", valid ? "text-leaf-600 dark:text-leaf-400" : "text-red-600 dark:text-red-400")}>
          {valid ? `${rows.filter((r) => r.kind === "title" ? r.label.trim() : r.refId).length} of 3 podium spots filled` : "Fill at least one podium spot"}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" loading={submitting} disabled={!valid} onClick={() => {
            onSubmit(rows.map((r) => ({
              position: r.position,
              kind: r.kind,
              teamId: r.kind === "team" ? r.refId || null : null,
              participantId: r.kind === "participant" ? r.refId || null : null,
              label: r.label.trim() || undefined,
              note: r.note.trim() || undefined,
            })));
          }}>
            <Medal className="size-4" /> Save results
          </Button>
        </div>
      </div>
    </div>
  );
}
