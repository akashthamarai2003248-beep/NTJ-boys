-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — Phase 2 migration
-- Evolves the Phase 1 games schema to the full model used by the
-- local demo store: explicit matches, richer podium rows, gallery
-- captions and event-attached games.
-- ════════════════════════════════════════════════════════════════

-- games gains the mode column (team vs individual) and a rules note
alter table public.games
  add column if not exists mode text not null default 'team'
    check (mode in ('team', 'individual')),
  add column if not exists rules text,
  add column if not exists updated_at timestamptz not null default now();

-- matches between teams (team-mode games only)
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  round text not null default 'League',
  team_a_id uuid references public.teams (id) on delete cascade,
  team_b_id uuid references public.teams (id) on delete cascade,
  score_a integer check (score_a >= 0),
  score_b integer check (score_b >= 0),
  status text not null default 'pending' check (status in ('pending', 'played')),
  winner_team_id uuid references public.teams (id) on delete cascade,
  note text,
  played_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matches_game_idx on public.matches (game_id);

-- game_results → podium rows may reference a team OR an individual
-- participant, or be a free-text special award (e.g. Best Batsman)
alter table public.game_results
  add column if not exists kind text not null default 'team'
    check (kind in ('team', 'participant', 'title')),
  add column if not exists participant_id uuid references public.participants (id) on delete cascade,
  add column if not exists label text,
  alter column team_id drop not null;

-- gallery: captions + uploader link (already present in 0001, widen)
alter table public.gallery
  add column if not exists caption text;

-- RLS for the new/changed tables
alter table public.matches enable row level security;
alter table public.game_results enable row level security;

create policy "read matches" on public.matches for select to authenticated using (true);
create policy "admin write matches" on public.matches for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "read game results" on public.game_results for select to authenticated using (true);
create policy "admin write game results" on public.game_results for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Public transparency view: results/receipts/teams stay private — the
-- overview only exposes totals + event aggregates (already enforced by
-- transparency_overview in 0001). Nothing to widen here.
