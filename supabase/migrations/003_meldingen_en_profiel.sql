-- ============================================================================
-- Migratie 003 — meldingen per gezin + profielfoto
--
-- Draai dit in de SQL Editor. Bij een vers project zit het al in schema.sql.
-- ============================================================================

-- 1. Profielfoto ------------------------------------------------------------
alter table public.users
  add column if not exists avatar_url text;

-- Google levert de foto als `avatar_url` of `picture`, afhankelijk van de flow.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, naam, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'naam', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Bestaande Google-gebruikers alsnog een foto geven.
update public.users u
set avatar_url = coalesce(
  nullif(a.raw_user_meta_data ->> 'avatar_url', ''),
  nullif(a.raw_user_meta_data ->> 'picture', '')
)
from auth.users a
where a.id = u.id and u.avatar_url is null;

-- 2. Wanneer las dit lid zijn meldingen voor het laatst? ---------------------
alter table public.family_members
  add column if not exists meldingen_gelezen_op timestamptz not null default now();

-- 3. Het logboek ------------------------------------------------------------
create table if not exists public.activiteit (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  -- null = Basiel deed het
  actor_id     uuid references public.users (id) on delete set null,
  soort        text not null,
  omschrijving text not null,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists activiteit_family_idx
  on public.activiteit (family_id, created_at desc);

alter table public.activiteit enable row level security;

drop policy if exists activiteit_select on public.activiteit;
create policy activiteit_select on public.activiteit for select
  using (public.is_family_member(family_id));

drop policy if exists activiteit_insert on public.activiteit;
create policy activiteit_insert on public.activiteit for insert
  with check (public.is_family_member(family_id));

-- Leden mogen hun eigen leesmoment bijwerken. De bestaande policies laten
-- alleen select en delete toe, dus update moet er apart bij.
drop policy if exists family_members_update_self on public.family_members;
create policy family_members_update_self on public.family_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Realtime, zodat het belletje meteen meetelt ----------------------------
do $$ begin
  execute 'alter publication supabase_realtime add table public.activiteit';
exception when duplicate_object then null;
end $$;
