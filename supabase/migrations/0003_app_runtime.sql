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

-- ── 6. Self-registration ────────────────────────────────────────
-- New members create their own login (member role). Allow a
-- freshly-signed-up user to insert exactly their own public.users
-- profile row (id = auth.uid()). Admin writes are unaffected —
-- Postgres combines policies with OR.
drop policy if exists "self insert user" on public.users;
create policy "self insert user" on public.users for insert to authenticated
  with check (auth.uid() = id);
