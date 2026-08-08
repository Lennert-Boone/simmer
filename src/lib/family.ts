import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { leesWeekParam } from "@/lib/week";
import type { Gezin, GezinsVoorkeuren, Weekmenu } from "@/lib/types";

export interface GezinsContext {
  userId: string;
  gezin: Gezin;
  rol: "owner" | "member";
  voorkeuren: GezinsVoorkeuren;
  weekmenu: Weekmenu;
  profiel: { naam: string | null; email: string; avatarUrl: string | null };
  /** Vanaf wanneer meldingen als ongelezen tellen voor dit lid. */
  meldingenGelezenOp: string;
}

/**
 * Haalt het gezin van de ingelogde gebruiker op, inclusief voorkeuren en het
 * weekmenu van de gevraagde week (dat wordt aangemaakt als het nog niet
 * bestaat). Zonder `weekParam` krijg je de huidige week.
 *
 * Geeft `null` terug wanneer de gebruiker nog geen gezin heeft — de aanroeper
 * stuurt dan door naar de onboarding.
 */
export async function getGezinsContext(weekParam?: string): Promise<GezinsContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: lidmaatschap } = await supabase
    .from("family_members")
    .select("role, meldingen_gelezen_op, families(id, naam, invite_code)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const gezin = lidmaatschap?.families as unknown as Gezin | undefined;
  if (!lidmaatschap || !gezin) return null;

  const { data: profielRij } = await supabase
    .from("users")
    .select("naam, email, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: voorkeurenRij } = await supabase
    .from("family_preferences")
    .select("*")
    .eq("family_id", gezin.id)
    .maybeSingle();

  const voorkeuren: GezinsVoorkeuren = {
    family_id: gezin.id,
    week_start_day: voorkeurenRij?.week_start_day ?? 0,
    meals_to_plan: voorkeurenRij?.meals_to_plan ?? ["avond"],
    kookstijl_notities: voorkeurenRij?.kookstijl_notities ?? "",
    dieetwensen: voorkeurenRij?.dieetwensen ?? [],
  };

  const start = leesWeekParam(weekParam, voorkeuren.week_start_day);
  const weekmenu = await getOfMaakWeekmenu(supabase, gezin.id, start);

  return {
    userId: user.id,
    gezin,
    rol: lidmaatschap.role as "owner" | "member",
    voorkeuren,
    weekmenu,
    profiel: {
      naam: profielRij?.naam ?? null,
      email: profielRij?.email ?? user.email ?? "",
      avatarUrl: profielRij?.avatar_url ?? null,
    },
    meldingenGelezenOp: lidmaatschap.meldingen_gelezen_op ?? new Date(0).toISOString(),
  };
}

export async function getOfMaakWeekmenu(
  supabase: SupabaseClient,
  familyId: string,
  weekStartDate: string,
): Promise<Weekmenu> {
  const { data: bestaand } = await supabase
    .from("weekmenus")
    .select("*")
    .eq("family_id", familyId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (bestaand) return bestaand as Weekmenu;

  const { data: nieuw, error } = await supabase
    .from("weekmenus")
    .insert({ family_id: familyId, week_start_date: weekStartDate, status: "concept" })
    .select("*")
    .single();

  if (error) {
    // Race met een ander gezinslid: het menu bestaat inmiddels wel.
    const { data: hersteld } = await supabase
      .from("weekmenus")
      .select("*")
      .eq("family_id", familyId)
      .eq("week_start_date", weekStartDate)
      .single();
    return hersteld as Weekmenu;
  }

  return nieuw as Weekmenu;
}
