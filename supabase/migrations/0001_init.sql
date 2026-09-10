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
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text unique,
  email text unique,
  role text not null default 'member' check (role in ('admin', 'treasurer', 'member')),
  position text not null default 'Member',
  created_at timestamptz not null default now()
);

-- ── members ──────────────────────────────────────────────────────
create table public.members (
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
create table public.events (
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
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  person_name text not null,
  phone text,
  street text,
  amount integer not null check (amount > 0),          -- whole rupees
  payment_method text not null check (payment_method in ('cash', 'upi', 'bank', 'other')),
  contribution_type text not null default 'name_phone'
    check (contribution_type in ('name', 'name_phone', 'voice')),  -- how the contributor was recorded
  date date not null,
  event_id uuid references public.events (id) on delete set null,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collections_event_idx on public.collections (event_id);
create index collections_date_idx on public.collections (date desc);

-- ── expenses (செலவு) ────────────────────────────────────────────
create table public.expenses (
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
create index expenses_event_idx on public.expenses (event_id);
create index expenses_date_idx on public.expenses (date desc);

-- ── receipts (mirrors each collection's printable receipt) ──────
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null unique references public.collections (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  receipt_number text unique not null,
  issued_at timestamptz not null default now()
);

-- ── activity_logs (audit — who did what, when) ──────────────────
create table public.activity_logs (
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
create index activity_logs_at_idx on public.activity_logs (at desc);

-- ── games / teams / participants / results (Phase 2 module) ─────
create table public.games (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  name text not null,
  tamil_name text not null default '',
  kind text not null check (kind in ('running', 'cricket', 'football', 'tug', 'spoon', 'other')),
  status text not null default 'open' check (status in ('open', 'ongoing', 'results', 'completed')),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  name text not null,
  color text not null default '#ff9933',
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  member_id uuid references public.members (id) on delete set null,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  position smallint not null check (position in (1, 2, 3)),
  notes text,
  recorded_at timestamptz not null default now(),
  unique (game_id, position)
);

-- ── gallery ──────────────────────────────────────────────────────
create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  url text not null,
  caption text,
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── settings (singleton) ─────────────────────────────────────────
create table public.settings (
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
create policy "read own user" on public.users for select using (auth.uid() = id or public.has_role('admin'));
create policy "read members" on public.members for select to authenticated using (true);
create policy "read events" on public.events for select to authenticated using (true);
create policy "read collections" on public.collections for select to authenticated using (true);
create policy "read expenses" on public.expenses for select to authenticated using (true);
create policy "read receipts" on public.receipts for select to authenticated using (true);
create policy "read activity" on public.activity_logs for select to authenticated using (true);
create policy "read games" on public.games for select to authenticated using (true);
create policy "read teams" on public.teams for select to authenticated using (true);
create policy "read participants" on public.participants for select to authenticated using (true);
create policy "read results" on public.game_results for select to authenticated using (true);
create policy "read gallery" on public.gallery for select to authenticated using (true);
create policy "read settings" on public.settings for select to authenticated using (true);

-- Writes — admin everywhere; treasurer additionally owns finances
create policy "admin write members" on public.members for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "admin write events" on public.events for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "finance write collections" on public.collections for all to authenticated
  using (public.has_role('admin') or public.has_role('treasurer'))
  with check (public.has_role('admin') or public.has_role('treasurer'));
create policy "finance write expenses" on public.expenses for all to authenticated
  using (public.has_role('admin') or public.has_role('treasurer'))
  with check (public.has_role('admin') or public.has_role('treasurer'));
create policy "finance write receipts" on public.receipts for all to authenticated
  using (public.has_role('admin') or public.has_role('treasurer'))
  with check (public.has_role('admin') or public.has_role('treasurer'));
create policy "admin write activity" on public.activity_logs for insert to authenticated
  with check (public.has_role('admin') or public.has_role('treasurer'));
create policy "admin write games" on public.games for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "admin write gallery" on public.gallery for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));
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
