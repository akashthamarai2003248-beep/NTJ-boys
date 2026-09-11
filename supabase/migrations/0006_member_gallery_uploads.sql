-- Members may contribute new gallery photos, but cannot edit or remove them.
-- Admins retain the existing full gallery-management policy.

drop policy if exists "member add gallery" on public.gallery;
create policy "member add gallery"
  on public.gallery for insert to authenticated
  with check (uploaded_by = auth.uid());

-- A member's gallery upload may be recorded in the audit trail; it cannot
-- create activity rows for other modules or for another user.
drop policy if exists "member gallery activity" on public.activity_logs;
create policy "member gallery activity"
  on public.activity_logs for insert to authenticated
  with check (entity = 'gallery' and actor_id = auth.uid());

-- Restrict direct Storage writes. Members can only place files under the
-- gallery/ folder; staff keep access to the other application image folders.
drop policy if exists "Allow image uploads" on storage.objects;
create policy "Allow gallery image uploads"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and name like 'gallery/%');

create policy "Allow staff image uploads"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (
      auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer')
    )
  );

drop policy if exists "Allow image updates" on storage.objects;
create policy "Allow staff image updates"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'images'
    and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer'))
  )
  with check (
    bucket_id = 'images'
    and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer'))
  );

drop policy if exists "Allow image deletes" on storage.objects;
create policy "Allow staff image deletes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'images'
    and (auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'treasurer'))
  );
