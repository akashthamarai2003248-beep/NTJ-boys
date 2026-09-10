-- ════════════════════════════════════════════════════════════════
-- NETHAJI BOYS MANDRAM — seed accounts (run in the SQL Editor)
--
-- Creates the three demo logins in Supabase Auth + public.users so
-- the role-aware RLS policies work. Run this AFTER 0001, 0002 and
-- 0003. Safe to re-run (idempotent).
--
--   admin     admin@nbm.demo     admin123      (President)
--   treasurer treasurer@nbm.demo treasurer123  (Treasurer)
--   member    member@nbm.demo    member123     (Member)
--
-- The app_metadata.role is what the public.has_role() RLS helper
-- reads from the JWT, so it is kept in sync on every run.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

do $$
declare
  v_email text;
  v_pw text;
  v_uid uuid;
  v_role text;
  v_name text;
  v_phone text;
  v_position text;
  v_row record;
begin
  for v_row in
    select *
    from (values
      ('admin@nbm.demo',     'admin123',     'admin',     'Sundaravel Rajan', '9840010001', 'President'),
      ('treasurer@nbm.demo', 'treasurer123', 'treasurer', 'Muthu Kannan',     '9840010002', 'Treasurer'),
      ('member@nbm.demo',    'member123',    'member',    'Karthik Raja',     '9840010003', 'Member')
    ) as t(email, pw, role, name, phone, position)
  loop
    v_email := v_row.email;
    v_pw := v_row.pw;
    v_role := v_row.role;
    v_name := v_row.name;
    v_phone := v_row.phone;
    v_position := v_row.position;

    insert into auth.users (
      instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', v_email,
      crypt(v_pw, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', v_role),
      jsonb_build_object('name', v_name),
      now(), now()
    )
    on conflict (email) do update
      set raw_app_meta_data = jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email'),
            'role', excluded.raw_app_meta_data->>'role'
          ),
          encrypted_password = case
            when auth.users.encrypted_password is null then excluded.encrypted_password
            else auth.users.encrypted_password
          end,
          email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
          updated_at = now();

    select id into v_uid from auth.users where email = v_email;

    insert into public.users (id, name, phone, email, role, position, created_at)
    values (v_uid, v_name, v_phone, v_email, v_role, v_position, now())
    on conflict (email) do update
      set name = excluded.name,
          phone = excluded.phone,
          role = excluded.role,
          position = excluded.position;
  end loop;
end;
$$;
