-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — migration 0004 · auth triggers & profile helper
--
-- Automatically creates a public.users profile row whenever a user
-- signs up in Supabase Auth (auth.users).
--
-- Solves: "Account created, but the profile couldn't be saved"
-- 1. handle_new_user() trigger on auth.users (security definer)
-- 2. create_user_profile() RPC helper (security definer, anon-callable)
-- 3. Backfill any existing auth.users rows missing from public.users
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
