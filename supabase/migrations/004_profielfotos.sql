-- ============================================================================
-- Migratie 004 — profielfoto's uploaden
--
-- Draai dit in de SQL Editor, ná migratie 003.
--
-- Maakt een publieke bucket `avatars`. Iedereen mag lezen (de foto's staan
-- toch in de app te kijk), maar schrijven mag alleen in je eigen map:
-- `<jouw-user-id>/…`. Zo kan niemand andermans foto overschrijven.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_iedereen_lezen" on storage.objects;
create policy "avatars_iedereen_lezen" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_eigen_map_toevoegen" on storage.objects;
create policy "avatars_eigen_map_toevoegen" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_eigen_map_wijzigen" on storage.objects;
create policy "avatars_eigen_map_wijzigen" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_eigen_map_verwijderen" on storage.objects;
create policy "avatars_eigen_map_verwijderen" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
