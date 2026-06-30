-- ============================================================================
-- FIX: Row Level Security + Auto-create profile on signup
-- Execute este arquivo no Supabase Dashboard > SQL Editor
-- ============================================================================

-- ── 1. TRIGGER: cria linha em profiles automaticamente ao criar usuário ──────
-- Sem isso, todo INSERT que referencia profiles(id) via FK vai falhar porque
-- a linha do usuário não existe ainda.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer          -- roda como superuser, ignora RLS
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, user_group)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)   -- usa parte antes do @ como fallback
    ),
    coalesce(new.raw_user_meta_data->>'role', 'coordenador'),
    coalesce(new.raw_user_meta_data->>'user_group', 'escritorio')
  )
  on conflict (id) do nothing;  -- idempotente, não quebra se já existir
  return new;
end;
$$;

-- Remove trigger anterior se existir
drop trigger if exists on_auth_user_created on auth.users;

-- Cria trigger que dispara após cada novo usuário criado
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. FIX: para usuários já existentes sem linha em profiles ───────────────
-- Insere perfil para quem já criou conta mas não tem linha em profiles

insert into public.profiles (id, full_name, role, user_group)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'coordenador',
  'escritorio'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);


-- ── 3. GARANTIR que as políticas RLS existem (idempotente) ──────────────────
-- Se o schema.sql já foi executado, estas são no-ops. Se não foi, cria agora.

-- profiles: usuário vê/edita apenas o próprio perfil (mais seguro)
do $$
begin
  -- Verifica se a policy já existe antes de criar
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can view own profile'
  ) then
    execute 'create policy "Users can view own profile" on profiles
      for select using (auth.uid() = id)';
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can update own profile'
  ) then
    execute 'create policy "Users can update own profile" on profiles
      for update using (auth.uid() = id) with check (auth.uid() = id)';
  end if;

  -- Permite que o trigger (security definer) insira, mas também permite
  -- que usuários autenticados vejam outros perfis (necessário para mostrar
  -- nome do projetista, revisor, etc.)
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Authenticated can read all profiles'
  ) then
    execute 'create policy "Authenticated can read all profiles" on profiles
      for select using (auth.role() = ''authenticated'')';
  end if;
end $$;


-- ── 4. STORAGE: políticas para os buckets de PDF ────────────────────────────
-- Execute DEPOIS de criar os buckets em Dashboard > Storage

-- Bucket: drawings (PDFs/DWGs — leitura e upload para autenticados)
insert into storage.buckets (id, name, public)
values ('drawings', 'drawings', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Políticas de Storage (remova e recrie se já existirem)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Authenticated can upload drawings'
  ) then
    execute 'create policy "Authenticated can upload drawings"
      on storage.objects for insert
      with check (bucket_id = ''drawings'' and auth.role() = ''authenticated'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Authenticated can read drawings'
  ) then
    execute 'create policy "Authenticated can read drawings"
      on storage.objects for select
      using (bucket_id = ''drawings'' and auth.role() = ''authenticated'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Authenticated can update drawings'
  ) then
    execute 'create policy "Authenticated can update drawings"
      on storage.objects for update
      using (bucket_id = ''drawings'' and auth.role() = ''authenticated'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Public can read thumbnails'
  ) then
    execute 'create policy "Public can read thumbnails"
      on storage.objects for select
      using (bucket_id = ''thumbnails'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Authenticated can upload thumbnails'
  ) then
    execute 'create policy "Authenticated can upload thumbnails"
      on storage.objects for insert
      with check (bucket_id = ''thumbnails'' and auth.role() = ''authenticated'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Public can read avatars'
  ) then
    execute 'create policy "Public can read avatars"
      on storage.objects for select
      using (bucket_id = ''avatars'')';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'Authenticated can upload avatars'
  ) then
    execute 'create policy "Authenticated can upload avatars"
      on storage.objects for insert
      with check (bucket_id = ''avatars'' and auth.role() = ''authenticated'')';
  end if;
end $$;
