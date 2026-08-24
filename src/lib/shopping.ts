import type { SupabaseClient } from "@supabase/supabase-js";
import { categoriseer } from "@/lib/categorieen";
import { ontbrekendeMigratie } from "@/lib/supabase/fouten";
import type { Ingredient } from "@/lib/types";

const normaliseer = (naam: string) => naam.trim().toLowerCase();

interface Regel {
  naam: string;
  hoeveelheid: number;
  eenheid: string;
}

/**
 * Bouwt de boodschappenlijst opnieuw op uit de weekmenu-ingrediënten minus de
 * huidige voorraad. Handmatig toegevoegde regels blijven staan; van
 * auto-gegenereerde regels wordt het vinkje bewaard zolang de naam gelijk blijft.
 */
export async function regenereerBoodschappenlijst(
  supabase: SupabaseClient,
  familyId: string,
  weekmenuId: string,
): Promise<void> {
  const [{ data: entries }, { data: voorraad }, { data: bestaand }] = await Promise.all([
    supabase.from("weekmenu_entries").select("ingredienten").eq("weekmenu_id", weekmenuId),
    supabase.from("pantry_items").select("naam, hoeveelheid, eenheid").eq("family_id", familyId),
    supabase
      .from("shopping_list_items")
      .select("naam, afgevinkt")
      .eq("family_id", familyId)
      .eq("weekmenu_id", weekmenuId)
      .eq("bron", "auto_gegenereerd"),
  ]);

  // 1. Alle ingrediënten optellen per (naam, eenheid).
  const nodig = new Map<string, Regel>();
  for (const entry of entries ?? []) {
    const ingredienten = (entry.ingredienten ?? []) as Ingredient[];
    for (const ing of ingredienten) {
      if (!ing?.naam) continue;
      const eenheid = ing.eenheid?.trim() || "stuk";
      const sleutel = `${normaliseer(ing.naam)}|${normaliseer(eenheid)}`;
      const bestaandeRegel = nodig.get(sleutel);
      const aantal = Number(ing.hoeveelheid) || 0;
      if (bestaandeRegel) {
        bestaandeRegel.hoeveelheid += aantal;
      } else {
        nodig.set(sleutel, { naam: ing.naam.trim(), hoeveelheid: aantal, eenheid });
      }
    }
  }

  // 2. Voorraad eraf halen.
  const voorraadPerNaamEnEenheid = new Map<string, number>();
  const voorraadNamen = new Set<string>();
  for (const item of voorraad ?? []) {
    const naam = normaliseer(item.naam);
    const eenheid = normaliseer(item.eenheid || "stuk");
    voorraadNamen.add(naam);
    voorraadPerNaamEnEenheid.set(
      `${naam}|${eenheid}`,
      (voorraadPerNaamEnEenheid.get(`${naam}|${eenheid}`) ?? 0) + (Number(item.hoeveelheid) || 0),
    );
  }

  const teKopen: Regel[] = [];
  for (const [sleutel, regel] of nodig) {
    const inHuisZelfdeEenheid = voorraadPerNaamEnEenheid.get(sleutel);
    if (inHuisZelfdeEenheid !== undefined) {
      const tekort = regel.hoeveelheid - inHuisZelfdeEenheid;
      if (tekort > 0.0001) teKopen.push({ ...regel, hoeveelheid: Math.round(tekort * 100) / 100 });
      continue;
    }
    // Wel in huis maar in een andere eenheid (bv. "olijfolie" in ml vs. eetlepels):
    // niet op de lijst zetten, anders koop je onnodig bij.
    if (voorraadNamen.has(normaliseer(regel.naam))) continue;
    teKopen.push(regel);
  }

  // 3. Vinkjes overnemen en de auto-regels vervangen.
  const eerderAfgevinkt = new Set(
    (bestaand ?? []).filter((r) => r.afgevinkt).map((r) => normaliseer(r.naam)),
  );

  await supabase
    .from("shopping_list_items")
    .delete()
    .eq("family_id", familyId)
    .eq("weekmenu_id", weekmenuId)
    .eq("bron", "auto_gegenereerd");

  if (teKopen.length === 0) return;

  const rijen = teKopen.map((regel) => ({
    family_id: familyId,
    weekmenu_id: weekmenuId,
    naam: regel.naam,
    hoeveelheid: regel.hoeveelheid,
    eenheid: regel.eenheid,
    afgevinkt: eerderAfgevinkt.has(normaliseer(regel.naam)),
    bron: "auto_gegenereerd" as const,
  }));

  const { error } = await supabase
    .from("shopping_list_items")
    .insert(rijen.map((r, i) => ({ ...r, categorie: categoriseer(teKopen[i].naam) })));

  // Draait migratie 005 nog niet, dan bestaat de kolom `categorie` niet. De
  // lijst zelf is belangrijker dan de indeling, dus dan schrijven we hem
  // zonder — de app leidt de categorie in dat geval in de weergave af.
  if (error && ontbrekendeMigratie(error)) {
    await supabase.from("shopping_list_items").insert(rijen);
  }
}
