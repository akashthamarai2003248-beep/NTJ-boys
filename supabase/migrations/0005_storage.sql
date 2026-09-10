/** ─────────────────────────────────────────────────────────────
 * MIGRATION 0005: Supabase Storage Bucket for Images (400 KB Limit)
 *
 * Configures the 'images' public storage bucket for:
 *   - Member profile photos (members/)
 *   - Event cover photos (events/)
 *   - Gallery photos (gallery/)
 *   - Expense bill photos (expenses/)
 *
 * Max size: 400 KB (409,600 bytes) per image.
 * ───────────────────────────────────────────────────────────── */

-- 1. Create or configure the public 'images' storage bucket
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

-- 2. Storage RLS policies for 'images' bucket

-- Allow public read access to all images
drop policy if exists "Public images access" on storage.objects;
create policy "Public images access"
  on storage.objects for select
  using (bucket_id = 'images');

-- Allow image uploads to the images bucket
drop policy if exists "Allow image uploads" on storage.objects;
create policy "Allow image uploads"
  on storage.objects for insert
  with check (bucket_id = 'images');

-- Allow updating image files
drop policy if exists "Allow image updates" on storage.objects;
create policy "Allow image updates"
  on storage.objects for update
  using (bucket_id = 'images');

-- Allow deleting images
drop policy if exists "Allow image deletes" on storage.objects;
create policy "Allow image deletes"
  on storage.objects for delete
  using (bucket_id = 'images');
