-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — ONE-SHOT SETUP (paste ALL of this into the
-- Supabase SQL Editor and press Run).
--
-- Combines: 0001_init.sql + 0002_games_and_gallery.sql +
-- 0003_app_runtime.sql + 0004_auth_triggers.sql  →  full schema + RLS +
-- runtime helpers + auth triggers (no seed logins, removes demo data).
--
-- Run it in the project shown in your Dashboard URL — it must match
-- the ref in .env.local (currently: ykdzuafvhxtuugrlvvhl).
-- Safe to run repeatedly. If any red error banner appears, that
-- statement failed and later ones were skipped — tell me the error.
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — initial schema (Supabase / PostgreSQL)
-- Phase 3 activates this; local demo mode mirrors the same shape
-- in ./.data/db.json.
--
-- Roles (app_metadata.role on auth.users): admin | treasurer | member
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── helper: current user's app role ──────────────────────────────
create or replace function public.has_role(required text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() ->> 'role'),
    'member'
  ) = required
$$;

-- ── users ────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text unique,
  email text unique,
  role text not null default 'member' check (role in ('admin', 'treasurer', 'member')),
  position text not null default 'Member',
  created_at timestamptz not null default now()
);

-- ── members ──────────────────────────────────────────────────────
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  street text not null default '',
  role text not null default 'Member'
    check (role in ('President', 'Secretary', 'Treasurer', 'Coordinator', 'Member', 'Volunteer')),
  joined_date date not null,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── events ───────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tamil_name text not null default '',
  type text not null check (type in ('festival', 'sports', 'community', 'meeting', 'other')),
  status text not null default 'upcoming'
    check (status in ('registration', 'upcoming', 'active', 'completed')),
  start_date date not null,
  end_date date not null,
  location text not null default '',
  description text not null default '',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── collections (வரவு) ──────────────────────────────────────────
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  person_name text not null,
  phone text,
  street text,
  amount integer not null check (amount > 0),          -- whole rupees
  payment_method text not null check (payment_method in ('cash', 'upi', 'bank', 'other')),
  date date not null,
  event_id uuid references public.events (id) on delete set null,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collections_event_idx on public.collections (event_id);
create index if not exists collections_date_idx on public.collections (date desc);

-- ── expenses (செலவு) ────────────────────────────────────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null
    check (category in ('Decoration', 'Food', 'Sound', 'Lighting', 'Pandal', 'Idol',
                        'Sports', 'Prizes', 'Transport', 'Cleaning', 'Printing', 'Other')),
  amount integer not null check (amount > 0),
  event_id uuid references public.events (id) on delete set null,
  paid_by text not null,
  date date not null,
  payment_method text not null check (payment_method in ('cash', 'upi', 'bank', 'other')),
  description text,
  bill_url text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_event_idx on public.expenses (event_id);
create index if not exists expenses_date_idx on public.expenses (date desc);

-- ── receipts (mirrors each collection's printable receipt) ──────
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null unique references public.collections (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  receipt_number text unique not null,
  issued_at timestamptz not null default now()
);

-- ── activity_logs (audit — who did what, when) ──────────────────
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  actor_name text not null,
  action text not null check (action in ('added', 'edited', 'deleted')),
  entity text not null check (entity in ('collection', 'expense', 'event', 'member', 'settings', 'game')),
  label text not null,
  amount integer,
  event_name text,
  at timestamptz not null default now()
);
create index if not exists activity_logs_at_idx on public.activity_logs (at desc);

-- ── games / teams / participants / results (Phase 2 module) ─────
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  name text not null,
  tamil_name text not null default '',
  kind text not null check (kind in ('running', 'cricket', 'football', 'tug', 'spoon', 'other')),
  status text not null default 'open' check (status in ('open', 'ongoing', 'results', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  name text not null,
  color text not null default '#ff9933',
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position smallint not null check (position in (1, 2, 3)),
  notes text,
  recorded_at timestamptz not null default now(),
  unique (game_id, position)
);

-- ── gallery ──────────────────────────────────────────────────────
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  url text not null,
  caption text,
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── settings (singleton) ─────────────────────────────────────────
create table if not exists public.settings (
  id boolean primary key default true check (id),
  public_view boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true) on conflict do nothing;

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.collections enable row level security;
alter table public.expenses enable row level security;
alter table public.receipts enable row level security;
alter table public.activity_logs enable row level security;
alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.game_results enable row level security;
alter table public.gallery enable row level security;
alter table public.settings enable row level security;

-- Any signed-in user may read records (finance is community-transparent)
drop policy if exists "read own user" on public.users;
create policy "read own user" on public.users for select using (auth.uid() = id or public.has_role('admin'));
drop policy if exists "read members" on public.members;
create policy "read members" on public.members for select to authenticated using (true);
drop policy if exists "read events" on public.events;
create policy "read events" on public.events for select to authenticated using (true);
drop policy if exists "read collections" on public.collections;
create policy "read collections" on public.collections for select to authenticated using (true);
drop policy if exists "read expenses" on public.expenses;
create policy "read expenses" on public.expenses for select to authenticated using (true);
drop policy if exists "read receipts" on public.receipts;
create policy "read receipts" on public.receipts for select to authenticated using (true);
drop policy if exists "read activity" on public.activity_logs;
create policy "read activity" on public.activity_logs for select to authenticated using (true);
drop policy if exists "read games" on public.games;
create policy "read games" on public.games for select to authenticated using (true);
drop policy if exists "read teams" on public.teams;
create policy "read teams" on public.teams for select to authenticated using (true);
drop policy if exists "read participants" on public.participants;
create policy "read participants" on public.participants for select to authenticated using (true);
drop policy if exists "read results" on public.game_results;
create policy "read results" on public.game_results for select to authenticated using (true);
drop policy if exists "read gallery" on public.gallery;
create policy "read gallery" on public.gallery for select to authenticated using (true);
drop policy if exists "read settings" on public.settings;
create policy "read settings" on public.settings for select to authenticated using (true);

-- Writes — admin everywhere; treasurer additionally owns finances
drop policy if exists "admin write members" on public.members;
create policy "admin write members" on public.members for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admin write events" on public.events;
create policy "admin write events" on public.events for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "finance write collections" on public.collections;
create policy "finance write collections" on public.collections for all to authenticated
  using (public.has_role('admin') or public.has_role('treasurer'))
  with check (public.has_role('admin') or public.has_role('treasurer'));
drop policy if exists "finance write expenses" on public.expenses;
create policy "finance write expenses" on public.expenses for all to authenticated
  using (public.has_role('admin') or public.has_role('treasurer'))
  with check (public.has_role('admin') or public.has_role('treasurer'));
drop policy if exists "finance write receipts" on public.receipts;
create policy "finance write receipts" on public.receipts for all to authenticated
  using (public.has_role('admin') or public.has_role('treasurer'))
  with check (public.has_role('admin') or public.has_role('treasurer'));
drop policy if exists "admin write activity" on public.activity_logs;
create policy "admin write activity" on public.activity_logs for insert to authenticated
  with check (public.has_role('admin') or public.has_role('treasurer'));
drop policy if exists "admin write games" on public.games;
create policy "admin write games" on public.games for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admin write gallery" on public.gallery;
create policy "admin write gallery" on public.gallery for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "admin settings" on public.settings;
create policy "admin settings" on public.settings for update to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Public transparency: only aggregate numbers, never private data
create or replace view public.transparency_overview as
  select
    (select coalesce(sum(amount), 0) from public.collections) as total_varavu,
    (select coalesce(sum(amount), 0) from public.expenses) as total_selavu,
    (select count(*) from public.members) as member_count,
    (select json_agg(json_build_object(
        'name', e.name, 'tamil_name', e.tamil_name, 'start_date', e.start_date,
        'status', e.status,
        'varavu', (select coalesce(sum(amount),0) from public.collections c where c.event_id = e.id),
        'selavu', (select coalesce(sum(amount),0) from public.expenses x where x.event_id = e.id)
      ) order by e.start_date)
     from public.events e) as events;
grant select on public.transparency_overview to anon, authenticated;

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

drop policy if exists "read matches" on public.matches;
create policy "read matches" on public.matches for select to authenticated using (true);
drop policy if exists "admin write matches" on public.matches;
create policy "admin write matches" on public.matches for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "read game results" on public.game_results;
create policy "read game results" on public.game_results for select to authenticated using (true);
drop policy if exists "admin write game results" on public.game_results;
create policy "admin write game results" on public.game_results for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Public transparency view: results/receipts/teams stay private — the
-- overview only exposes totals + event aggregates (already enforced by
-- transparency_overview in 0001). Nothing to widen here.

-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — migration 0003 · app runtime helpers
--
-- Fills the gaps the Supabase adapter needs that 0001/0002 did not
-- cover, without touching the data shape already mirrored by the
-- local demo store:
--   1. updated_at maintenance triggers
--   2. next_receipt() — atomic NBM-YYYY-NNNN receipt numbering
--   3. Denormalized actor display names on collections/expenses/
--      gallery (public.users is RLS-hidden from non-admins, but the
--      UI shows "Recorded by <name>" to every reader)
--   4. activity_logs.entity check widened to include 'gallery'
--   5. public_overview() — security-definer RPC that mirrors the
--      local repo's publicOverview() JSON, safe for anon readers
-- ════════════════════════════════════════════════════════════════

-- ── 1. updated_at triggers ──────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'public.members', 'public.events', 'public.collections',
    'public.expenses', 'public.games', 'public.matches', 'public.settings'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on %s', t
    );
    execute format(
      'create trigger set_updated_at before update on %s
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end;
$$;

-- ── 2. Receipt numbering ────────────────────────────────────────
-- Returns the next NBM-<year>-NNNN for a collection dated p_date.
-- An xact-scoped advisory lock keeps concurrent inserts from
-- issuing the same number.
create or replace function public.next_receipt(p_date date)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  prefix text := 'NBM-' || to_char(p_date, 'YYYY') || '-';
  n int;
begin
  perform pg_advisory_xact_lock(hashtext(prefix));
  select coalesce(max((substr(receipt_number, length(prefix) + 1))::int), 0) + 1
    into n
    from public.collections
   where receipt_number like prefix || '%';
  return prefix || lpad(n::text, 4, '0');
end;
$$;

-- ── 3. Denormalized actor names (display under RLS) ─────────────
alter table public.collections
  add column if not exists created_by_name text;
alter table public.expenses
  add column if not exists created_by_name text;
alter table public.gallery
  add column if not exists uploaded_by_name text;

-- backfill from the actor ids for rows already recorded
update public.collections c
   set created_by_name = u.name
  from public.users u
 where c.created_by = u.id and c.created_by_name is null;
update public.expenses e
   set created_by_name = u.name
  from public.users u
 where e.created_by = u.id and e.created_by_name is null;
update public.gallery g
   set uploaded_by_name = u.name
  from public.users u
 where g.uploaded_by = u.id and g.uploaded_by_name is null;

-- ── 4. activity_logs.entity check ───────────────────────────────
alter table public.activity_logs
  drop constraint if exists activity_logs_entity_check;
alter table public.activity_logs
  add constraint activity_logs_entity_check check (
    entity in ('collection', 'expense', 'event', 'member', 'settings', 'game', 'gallery')
  );

-- ── 5. Public transparency overview (anon-safe) ─────────────────
-- Mirrors repository.publicOverview(): returns NULL when the admin
-- switched the public view off; otherwise the full JSON document.
-- security definer so anon callers never touch RLS-hidden tables.
create or replace function public.public_overview()
returns json
language sql
security definer set search_path = public
as $$
  select case when s.public_view then
    json_build_object(
      'enabled', true,
      'updatedAt', s.updated_at,
      'totals', json_build_object(
        'varavu', coalesce((select sum(amount) from public.collections), 0),
        'selavu', coalesce((select sum(amount) from public.expenses), 0),
        'balance', coalesce((select sum(amount) from public.collections), 0)
                   - coalesce((select sum(amount) from public.expenses), 0),
        'members', (select count(*) from public.members)
      ),
      'events', coalesce((
        select json_agg(json_build_object(
          'id', e.id,
          'name', e.name,
          'tamilName', e.tamil_name,
          'type', e.type,
          'status', e.status,
          'startDate', to_char(e.start_date, 'YYYY-MM-DD'),
          'endDate', to_char(e.end_date, 'YYYY-MM-DD'),
          'location', e.location,
          'description', e.description,
          'varavu', coalesce((select sum(c.amount) from public.collections c where c.event_id = e.id), 0),
          'selavu', coalesce((select sum(x.amount) from public.expenses x where x.event_id = e.id), 0),
          'balance', coalesce((select sum(c.amount) from public.collections c where c.event_id = e.id), 0)
                      - coalesce((select sum(x.amount) from public.expenses x where x.event_id = e.id), 0)
        ) order by e.start_date)
        from public.events e
      ), '[]'::json)
    )
  else json_build_object('enabled', false, 'totals', null, 'events', '[]'::json, 'updatedAt', s.updated_at)
  end
  from public.settings s
  where s.id;
$$;

revoke all on function public.public_overview() from public;
grant execute on function public.public_overview() to anon, authenticated;
grant execute on function public.next_receipt(date) to authenticated;

-- Map a phone number to the matching login email so the app can
-- keep accepting "phone or email" at sign-in. Email is the only
-- credential Supabase Auth stores; this lookup lets members sign
-- in with the number they actually remember.
create or replace function public.user_email_by_phone(p_phone text)
returns text
language sql
security definer set search_path = public
stable
as $$
  select email from public.users
   where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') =
         regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
   limit 1
$$;

revoke all on function public.user_email_by_phone(text) from public;
grant execute on function public.user_email_by_phone(text) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — Clean up demo accounts (if present)
-- ════════════════════════════════════════════════════════════════
delete from auth.users where email like '%@nbm.demo';
delete from public.users where email like '%@nbm.demo';

-- ── contribution_type column (safe re-run) ──────────────────────────
alter table public.collections
  add column if not exists contribution_type text not null default 'name_phone'
  check (contribution_type in ('name', 'name_phone', 'voice'));

-- ── self-registration policy (safe re-run) ──────────────────────────
-- New members create their own login (member role). Allow a
-- freshly-signed-up user to insert exactly their own public.users
-- profile row (id = auth.uid()). Admin writes are unaffected —
-- Postgres combines policies with OR.
drop policy if exists "self insert user" on public.users;
create policy "self insert user" on public.users for insert to authenticated
  with check (auth.uid() = id);

-- ════════════════════════════════════════════════════════════════
-- migration 0004 · auth triggers & profile helper
-- ════════════════════════════════════════════════════════════════

-- ── 1. Auto-create user profile on auth.users insert ────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_phone text;
begin
  v_role := case
    when new.raw_app_meta_data->>'role' in ('admin', 'treasurer', 'member')
    then new.raw_app_meta_data->>'role'
    else 'member'
  end;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1),
    'Member'
  );

  v_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', new.phone)), '');

  insert into public.users (id, name, phone, email, role, position, created_at)
  values (
    new.id,
    v_name,
    v_phone,
    new.email,
    v_role,
    coalesce(nullif(trim(new.raw_user_meta_data->>'position'), ''), 'Member'),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, public.users.phone),
    email = coalesce(excluded.email, public.users.email);

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Security-definer RPC for registration route ──────────────
create or replace function public.create_user_profile(
  p_id uuid,
  p_name text,
  p_phone text,
  p_email text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, phone, email, role, position, created_at)
  values (
    p_id,
    p_name,
    nullif(trim(p_phone), ''),
    p_email,
    'member',
    'Member',
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, public.users.phone),
    email = coalesce(excluded.email, public.users.email);
end;
$$;

revoke all on function public.create_user_profile(uuid, text, text, text) from public;
grant execute on function public.create_user_profile(uuid, text, text, text) to anon, authenticated;

-- ── 3. Backfill existing auth.users missing in public.users ───────
insert into public.users (id, name, phone, email, role, position, created_at)
select
  au.id,
  coalesce(nullif(trim(au.raw_user_meta_data->>'name'), ''), split_part(au.email, '@', 1), 'Member'),
  nullif(trim(coalesce(au.raw_user_meta_data->>'phone', au.phone)), ''),
  au.email,
  case
    when au.raw_app_meta_data->>'role' in ('admin', 'treasurer', 'member')
    then au.raw_app_meta_data->>'role'
    else 'member'
  end,
  'Member',
  au.created_at
from auth.users au
where not exists (
  select 1 from public.users pu where pu.id = au.id
)
on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — Phase 5 migration
-- Supabase Storage Bucket for Images (400 KB Limit)
-- ════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'images',
  'images',
  true,
  409600, -- 400 KB strictly enforced by Supabase Storage
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 409600,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Public images access" on storage.objects;
create policy "Public images access"
  on storage.objects for select
  using (bucket_id = 'images');

drop policy if exists "Allow image uploads" on storage.objects;
create policy "Allow image uploads"
  on storage.objects for insert
  with check (bucket_id = 'images');

drop policy if exists "Allow image updates" on storage.objects;
create policy "Allow image updates"
  on storage.objects for update
  using (bucket_id = 'images');

drop policy if exists "Allow image deletes" on storage.objects;
create policy "Allow image deletes"
  on storage.objects for delete
  using (bucket_id = 'images');

-- ── Member gallery contributions (0006) ────────────────────────
-- Members may add only their own gallery rows. The existing admin policy
-- continues to allow full gallery management for administrators.
drop policy if exists "member add gallery" on public.gallery;
create policy "member add gallery"
  on public.gallery for insert to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "member gallery activity" on public.activity_logs;
create policy "member gallery activity"
  on public.activity_logs for insert to authenticated
  with check (entity = 'gallery' and actor_id = auth.uid());

drop policy if exists "Allow image uploads" on storage.objects;
create policy "Allow gallery image uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and name like 'gallery/%');

drop policy if exists "Allow staff image uploads" on storage.objects;
create policy "Allow staff image uploads"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer'))
  );

drop policy if exists "Allow image updates" on storage.objects;
create policy "Allow staff image updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'images' and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer')))
  with check (bucket_id = 'images' and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer')));

drop policy if exists "Allow image deletes" on storage.objects;
create policy "Allow staff image deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer')));
