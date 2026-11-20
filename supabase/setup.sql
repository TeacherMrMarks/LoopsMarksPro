-- Execute no SQL Editor do seu projeto Supabase.
create table if not exists public.loops_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  row_version integer not null default 1 check (row_version > 0),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.loops_songs enable row level security;
revoke all on public.loops_songs from anon, authenticated;
grant select, insert, update on public.loops_songs to authenticated;

drop policy if exists "loops_owner_select" on public.loops_songs;
create policy "loops_owner_select" on public.loops_songs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "loops_owner_insert" on public.loops_songs;
create policy "loops_owner_insert" on public.loops_songs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "loops_owner_update" on public.loops_songs;
create policy "loops_owner_update" on public.loops_songs
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('loops-audio', 'loops-audio', false, 33554432)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "loops_audio_owner_select" on storage.objects;
create policy "loops_audio_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'loops-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "loops_audio_owner_insert" on storage.objects;
create policy "loops_audio_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'loops-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "loops_audio_owner_update" on storage.objects;
create policy "loops_audio_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'loops-audio' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'loops-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));
