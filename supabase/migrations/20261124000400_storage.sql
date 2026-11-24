-- =============================================================================
-- FitTrack — Storage
--   avatars         (privado): cada usuário só acessa a pasta "<user_id>/".
--   exercise-media  (público, leitura): mídias extras do catálogo; escrita só
--                   com service_role.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('exercise-media', 'exercise-media', true, 10485760, array['image/gif', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Usuário lê o próprio avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Usuário envia o próprio avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Usuário atualiza o próprio avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Usuário remove o próprio avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Mídias de exercícios são públicas"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'exercise-media');
