-- ============================================================================
-- Migratie 001 — naam overnemen bij aanmelden met Google
--
-- Draai dit in de SQL Editor als je schema.sql al eerder hebt uitgevoerd.
-- Bij een vers project zit dit al in schema.sql en hoef je hier niets mee.
--
-- Google zet de naam in raw_user_meta_data als `full_name` (en `name`), niet
-- als `naam`. Zonder deze aanpassing heet iedereen die met Google inlogt naar
-- het stukje van hun e-mailadres vóór de @.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, naam)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'naam', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Bestaande gebruikers die al met Google inlogden bijwerken, maar alleen als
-- hun naam nog de e-mailprefix is (dus niet zelf aangepast).
update public.users u
set naam = coalesce(
  nullif(a.raw_user_meta_data ->> 'full_name', ''),
  nullif(a.raw_user_meta_data ->> 'name', ''),
  u.naam
)
from auth.users a
where a.id = u.id
  and u.naam = split_part(u.email, '@', 1)
  and coalesce(
    a.raw_user_meta_data ->> 'full_name',
    a.raw_user_meta_data ->> 'name'
  ) is not null;
