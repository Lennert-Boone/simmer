-- ============================================================================
-- Migratie 002 — bereidingswijze per gerecht
--
-- Draai dit in de SQL Editor. Bij een vers project zit het al in schema.sql.
--
-- De stappen worden niet meegegenereerd bij het plannen van de week — dat zou
-- elke menuvraag flink duurder en trager maken voor zeven gerechten die je
-- misschien niet eens allemaal opent. In plaats daarvan vult de detailpagina
-- ze aan op het moment dat je een gerecht voor het eerst openklikt, en bewaart
-- het resultaat hier.
-- ============================================================================

alter table public.weekmenu_entries
  add column if not exists bereidingswijze jsonb not null default '[]'::jsonb,
  add column if not exists recept_bijgewerkt_op timestamptz;
