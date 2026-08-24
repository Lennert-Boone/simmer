-- ============================================================================
-- Migratie 005 — boodschappencategorieën, week vooruit, eigen AI-sleutel, foto's
--
-- Draai dit in de SQL Editor, ná migratie 004.
-- ============================================================================

-- 1. Boodschappenlijst per categorie -----------------------------------------
alter table public.shopping_list_items
  add column if not exists categorie text not null default 'overig';

create index if not exists shopping_list_items_categorie_idx
  on public.shopping_list_items (family_id, weekmenu_id, categorie);

-- 2. Boodschappenlijst loopt een week voor ------------------------------------
-- Wie zaterdag boodschappen doet voor de week erop, wil die lijst zien en niet
-- die van de week die bijna om is. Instelbaar, want niet elk gezin doet dat zo.
alter table public.family_preferences
  add column if not exists boodschappen_weken_vooruit smallint not null default 1
    check (boodschappen_weken_vooruit between 0 and 4);

-- 3. Foto bij het gerecht ----------------------------------------------------
alter table public.weekmenu_entries
  add column if not exists foto_url text,
  add column if not exists foto_bron text;

-- 4. Eigen AI-instellingen per gezin -----------------------------------------
-- Aparte tabel, niet in family_preferences: de sleutel is gevoelig en verdient
-- een striktere policy dan de rest van de voorkeuren.
create table if not exists public.family_ai_config (
  family_id   uuid primary key references public.families (id) on delete cascade,
  -- 'gemini' | 'anthropic'
  provider    text not null default 'gemini',
  model       text,
  -- Eigen sleutel; leeg = de gedeelde sleutel uit de omgevingsvariabelen.
  api_key     text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users (id)
);

alter table public.family_ai_config enable row level security;

-- Alleen de beheerder van het gezin komt bij de sleutel. Andere leden hoeven
-- hem niet te zien; zij merken alleen dat de chat werkt.
drop policy if exists family_ai_config_owner on public.family_ai_config;
create policy family_ai_config_owner on public.family_ai_config for all
  using (public.is_family_owner(family_id))
  with check (public.is_family_owner(family_id));

-- 5. Bestaande boodschappen alvast een categorie geven ------------------------
-- Ruwe eerste indeling; de app hercategoriseert bij de volgende herberekening.
update public.shopping_list_items set categorie = case
  when naam ~* '(diepvries|erwtjes|spinazie|ijs)'                             then 'diepvries'
  when naam ~* '(melk|kaas|yoghurt|room|boter|ei|eieren|kwark)'               then 'zuivel'
  when naam ~* '(brood|pistolet|baguette|beschuit|croissant)'                 then 'brood'
  when naam ~* '(blik|bokaal|passata|tomatenblokjes|kikkererwt|mais|maïs)'    then 'conserven'
  when naam ~* '(kip|rund|varken|gehakt|spek|worst|vis|zalm|kabeljauw|garnaal)' then 'vlees & vis'
  when naam ~* '(appel|banaan|ui|prei|wortel|sla|tomaat|paprika|aardappel|courgette|broccoli|pompoen)' then 'groenten & fruit'
  when naam ~* '(pasta|rijst|meel|suiker|bloem|penne|spaghetti|couscous|linzen)' then 'droge voorraad'
  when naam ~* '(olie|azijn|peper|zout|kruid|bouillon|saus|mosterd)'          then 'kruiden & olie'
  when naam ~* '(water|sap|bier|wijn|cola|koffie|thee)'                       then 'dranken'
  else 'overig'
end
where categorie = 'overig';
