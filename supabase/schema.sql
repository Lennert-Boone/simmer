-- ============================================================================
-- Weekmenu-maaltijdplanner — volledig schema
-- Draai dit één keer in de Supabase SQL Editor van een leeg project.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  naam       text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  naam        text not null,
  invite_code text not null unique,
  created_at  timestamptz not null default now()
);

do $$ begin
  create type public.family_role as enum ('owner', 'member');
exception when duplicate_object then null;
end $$;

create table if not exists public.family_members (
  family_id            uuid not null references public.families (id) on delete cascade,
  user_id              uuid not null references public.users (id) on delete cascade,
  role                 public.family_role not null default 'member',
  meldingen_gelezen_op timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- Logboek van wat er in het gezin verandert; voedt het belletje in de app.
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

-- Instelbaar per gezin: elk gezin heeft een ander ritme.
-- week_start_day: 0 = zondag ... 6 = zaterdag
-- dieetwensen: [{ "naam": "Sofie", "tekst": "geen noten, geen schaaldieren" }]
create table if not exists public.family_preferences (
  family_id          uuid primary key references public.families (id) on delete cascade,
  week_start_day     smallint not null default 0 check (week_start_day between 0 and 6),
  meals_to_plan      text[] not null default array['avond'],
  kookstijl_notities text not null default '',
  dieetwensen        jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

create table if not exists public.pantry_items (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references public.families (id) on delete cascade,
  naam         text not null,
  hoeveelheid  numeric not null default 1,
  eenheid      text not null default 'stuk',
  categorie    text not null default 'overig',
  houdbaar_tot date,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.users (id)
);
create index if not exists pantry_items_family_idx on public.pantry_items (family_id, categorie, naam);

do $$ begin
  create type public.weekmenu_status as enum ('concept', 'bevestigd');
exception when duplicate_object then null;
end $$;

create table if not exists public.weekmenus (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references public.families (id) on delete cascade,
  week_start_date date not null,
  status          public.weekmenu_status not null default 'concept',
  created_at      timestamptz not null default now(),
  unique (family_id, week_start_date)
);

do $$ begin
  create type public.entry_bron as enum ('ai_generated', 'database', 'handmatig');
exception when duplicate_object then null;
end $$;

create table if not exists public.weekmenu_entries (
  id                     uuid primary key default gen_random_uuid(),
  weekmenu_id            uuid not null references public.weekmenus (id) on delete cascade,
  datum                  date not null,
  maaltijdtype           text not null default 'avond',
  titel                  text not null,
  beschrijving           text not null default '',
  ingredienten           jsonb not null default '[]'::jsonb,
  porties                integer not null default 4,
  bereidingstijd_minuten integer,
  -- Lijst met stappen, pas gevuld wanneer iemand het gerecht openklikt.
  bereidingswijze        jsonb not null default '[]'::jsonb,
  recept_bijgewerkt_op   timestamptz,
  bron                   public.entry_bron not null default 'ai_generated',
  created_by             uuid references public.users (id),
  created_at             timestamptz not null default now(),
  -- Eén gerecht per dag per maaltijdtype: laat de AI een slot vervangen i.p.v. dupliceren.
  unique (weekmenu_id, datum, maaltijdtype)
);
create index if not exists weekmenu_entries_menu_idx on public.weekmenu_entries (weekmenu_id, datum);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  weekmenu_id uuid references public.weekmenus (id) on delete cascade,
  user_id     uuid references public.users (id) on delete set null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_family_idx on public.chat_messages (family_id, created_at);

do $$ begin
  create type public.shopping_bron as enum ('auto_gegenereerd', 'handmatig');
exception when duplicate_object then null;
end $$;

create table if not exists public.shopping_list_items (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families (id) on delete cascade,
  weekmenu_id uuid references public.weekmenus (id) on delete cascade,
  naam        text not null,
  hoeveelheid numeric,
  eenheid     text,
  afgevinkt   boolean not null default false,
  bron        public.shopping_bron not null default 'auto_gegenereerd',
  created_at  timestamptz not null default now()
);
create index if not exists shopping_list_items_family_idx on public.shopping_list_items (family_id, weekmenu_id);

-- ---------------------------------------------------------------------------
-- Helpers (security definer — voorkomt oneindige recursie in de policies)
-- ---------------------------------------------------------------------------

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(fid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.shares_family_with(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = auth.uid() and theirs.user_id = uid
  );
$$;

-- Nieuwe auth-gebruiker krijgt automatisch een profiel.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Google levert de naam als `full_name`/`name`, niet als `naam`.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Gezin aanmaken / joinen — als RPC, zodat family_members niet vrij
-- beschrijfbaar hoeft te zijn.
-- ---------------------------------------------------------------------------

create or replace function public.create_family(family_naam text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id   uuid;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  -- Korte, uitspreekbare code; botsingen zijn zeldzaam maar worden opgevangen.
  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.families where invite_code = new_code);
  end loop;

  insert into public.families (naam, invite_code)
  values (family_naam, new_code)
  returning id into new_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  insert into public.family_preferences (family_id) values (new_id);

  return new_id;
end;
$$;

create or replace function public.join_family(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  select id into target from public.families where invite_code = upper(trim(code));
  if target is null then
    raise exception 'Geen gezin gevonden met die code';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (target, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  return target;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users               enable row level security;
alter table public.families            enable row level security;
alter table public.family_members      enable row level security;
alter table public.family_preferences  enable row level security;
alter table public.pantry_items        enable row level security;
alter table public.weekmenus           enable row level security;
alter table public.weekmenu_entries    enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.activiteit           enable row level security;

-- users
drop policy if exists users_select on public.users;
create policy users_select on public.users for select
  using (id = auth.uid() or public.shares_family_with(id));

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());

-- families: lezen als lid. Aanmaken loopt via create_family().
drop policy if exists families_select on public.families;
create policy families_select on public.families for select
  using (public.is_family_member(id));

drop policy if exists families_update on public.families;
create policy families_update on public.families for update
  using (public.is_family_owner(id)) with check (public.is_family_owner(id));

-- family_members: lezen als lid, verwijderen alleen door de owner
-- (of door jezelf, om het gezin te verlaten).
drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members for select
  using (public.is_family_member(family_id));

drop policy if exists family_members_update_self on public.family_members;
create policy family_members_update_self on public.family_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists family_members_delete on public.family_members;
create policy family_members_delete on public.family_members for delete
  using (public.is_family_owner(family_id) or user_id = auth.uid());

-- Alle overige gezin-tabellen: volledig lees/schrijfbaar voor leden.
drop policy if exists family_preferences_all on public.family_preferences;
create policy family_preferences_all on public.family_preferences for all
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists pantry_items_all on public.pantry_items;
create policy pantry_items_all on public.pantry_items for all
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists weekmenus_all on public.weekmenus;
create policy weekmenus_all on public.weekmenus for all
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists weekmenu_entries_all on public.weekmenu_entries;
create policy weekmenu_entries_all on public.weekmenu_entries for all
  using (exists (
    select 1 from public.weekmenus w
    where w.id = weekmenu_id and public.is_family_member(w.family_id)
  ))
  with check (exists (
    select 1 from public.weekmenus w
    where w.id = weekmenu_id and public.is_family_member(w.family_id)
  ));

drop policy if exists chat_messages_all on public.chat_messages;
create policy chat_messages_all on public.chat_messages for all
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists shopping_list_items_all on public.shopping_list_items;
create policy shopping_list_items_all on public.shopping_list_items for all
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

drop policy if exists activiteit_select on public.activiteit;
create policy activiteit_select on public.activiteit for select
  using (public.is_family_member(family_id));

drop policy if exists activiteit_insert on public.activiteit;
create policy activiteit_insert on public.activiteit for insert
  with check (public.is_family_member(family_id));

-- ---------------------------------------------------------------------------
-- Realtime — gedeeld gezinsoverzicht
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'pantry_items', 'weekmenu_entries', 'shopping_list_items', 'chat_messages',
    'weekmenus', 'activiteit'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
