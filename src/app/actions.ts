"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGezinsContext } from "@/lib/family";
import { regenereerBoodschappenlijst } from "@/lib/shopping";
import { logActiviteit } from "@/lib/activiteit";
import { dagLabel, weekLabel } from "@/lib/week";
import { isGeldigModel, STANDAARD, type Provider } from "@/lib/ai";
import { migratieMelding } from "@/lib/supabase/fouten";
import type { Dieetwens, Maaltijdtype } from "@/lib/types";

/** Leest de verborgen `week`-parameter die de formulieren meesturen. */
function weekUit(formData: FormData): string | undefined {
  const waarde = formData.get("week");
  return typeof waarde === "string" && waarde ? waarde : undefined;
}

export async function maakGezin(_vorigeStaat: unknown, formData: FormData) {
  const naam = String(formData.get("naam") ?? "").trim();
  if (!naam) return { fout: "Geef je gezin een naam." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_family", { family_naam: naam });
  if (error) return { fout: error.message };

  redirect("/onboarding/voorkeuren");
}

export async function treedToe(_vorigeStaat: unknown, formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { fout: "Vul de uitnodigingscode in." };

  const supabase = await createClient();
  const { data: familyId, error } = await supabase.rpc("join_family", { code });
  if (error) return { fout: "Geen gezin gevonden met die code." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (familyId && user) {
    const { data: profiel } = await supabase
      .from("users")
      .select("naam, email")
      .eq("id", user.id)
      .maybeSingle();
    await logActiviteit(supabase, {
      familyId: familyId as string,
      actorId: user.id,
      soort: "lid_toegevoegd",
      omschrijving: `${profiel?.naam || profiel?.email || "Iemand"} sloot aan bij het gezin.`,
    });
  }

  redirect("/week");
}

export async function slaVoorkeurenOp(_vorigeStaat: unknown, formData: FormData) {
  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");

  const maaltijden = formData.getAll("maaltijden").map(String) as Maaltijdtype[];
  const dieetwensen: Dieetwens[] = [];
  for (const [sleutel, waarde] of formData.entries()) {
    if (!sleutel.startsWith("dieet_naam_")) continue;
    const index = sleutel.replace("dieet_naam_", "");
    const naam = String(waarde).trim();
    const tekst = String(formData.get(`dieet_tekst_${index}`) ?? "").trim();
    if (naam || tekst) dieetwensen.push({ naam, tekst });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("family_preferences").upsert(
    {
      family_id: context.gezin.id,
      week_start_day: Number(formData.get("week_start_day") ?? 0),
      meals_to_plan: maaltijden.length > 0 ? maaltijden : ["avond"],
      kookstijl_notities: String(formData.get("kookstijl") ?? "").trim(),
      boodschappen_weken_vooruit: Math.min(
        4,
        Math.max(0, Number(formData.get("boodschappen_weken_vooruit") ?? 1)),
      ),
      dieetwensen,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "family_id" },
  );

  if (error) return { fout: error.message };

  await logActiviteit(supabase, {
    familyId: context.gezin.id,
    actorId: context.userId,
    soort: "voorkeuren_gewijzigd",
    omschrijving: `${context.profiel.naam || "Iemand"} paste de gezinsvoorkeuren aan.`,
  });

  revalidatePath("/", "layout");
  redirect("/week");
}

export async function verwijderLid(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const context = await getGezinsContext();
  if (!context || context.rol !== "owner") return;

  const supabase = await createClient();
  const { data: verwijderd } = await supabase
    .from("users")
    .select("naam, email")
    .eq("id", userId)
    .maybeSingle();

  await supabase
    .from("family_members")
    .delete()
    .eq("family_id", context.gezin.id)
    .eq("user_id", userId);

  await logActiviteit(supabase, {
    familyId: context.gezin.id,
    actorId: context.userId,
    soort: "lid_verwijderd",
    omschrijving: `${verwijderd?.naam || verwijderd?.email || "Een lid"} hoort niet meer bij het gezin.`,
  });

  revalidatePath("/instellingen");
}

export async function verwijderGerecht(formData: FormData) {
  const entryId = String(formData.get("entry_id") ?? "");
  const week = weekUit(formData);

  const context = await getGezinsContext(week);
  if (!context) return;

  const supabase = await createClient();

  const { data: gerecht } = await supabase
    .from("weekmenu_entries")
    .select("titel, datum")
    .eq("id", entryId)
    .maybeSingle();

  await supabase.from("weekmenu_entries").delete().eq("id", entryId);
  await regenereerBoodschappenlijst(supabase, context.gezin.id, context.weekmenu.id);

  if (gerecht) {
    await logActiviteit(supabase, {
      familyId: context.gezin.id,
      actorId: context.userId,
      soort: "gerecht_verwijderd",
      omschrijving: `${context.profiel.naam || "Iemand"} haalde "${gerecht.titel}" van ${dagLabel(gerecht.datum)}.`,
    });
  }

  revalidatePath("/week");
  revalidatePath("/boodschappen");
  redirect(week ? `/week?week=${week}` : "/week");
}

export async function bevestigWeekmenu(formData: FormData) {
  const week = weekUit(formData);
  const context = await getGezinsContext(week);
  if (!context) return;

  const supabase = await createClient();
  const nieuweStatus = context.weekmenu.status === "bevestigd" ? "concept" : "bevestigd";
  await supabase.from("weekmenus").update({ status: nieuweStatus }).eq("id", context.weekmenu.id);

  await logActiviteit(supabase, {
    familyId: context.gezin.id,
    actorId: context.userId,
    soort: "menu_bevestigd",
    omschrijving:
      nieuweStatus === "bevestigd"
        ? `${context.profiel.naam || "Iemand"} bevestigde het menu van ${weekLabel(context.weekmenu.week_start_date)}.`
        : `${context.profiel.naam || "Iemand"} zette het menu van ${weekLabel(context.weekmenu.week_start_date)} terug op concept.`,
  });

  revalidatePath("/week");
}

export async function herbouwBoodschappenlijst(formData: FormData) {
  const week = weekUit(formData);
  const context = await getGezinsContext(week);
  if (!context) return;

  const supabase = await createClient();
  await regenereerBoodschappenlijst(supabase, context.gezin.id, context.weekmenu.id);

  revalidatePath("/boodschappen");
}

/**
 * Slaat de AI-keuze van het gezin op. Alleen de beheerder mag dit — de
 * RLS-policy op family_ai_config dwingt dat ook af, deze check geeft er alleen
 * een leesbare melding bij.
 */
export async function slaAiConfigOp(_vorigeStaat: unknown, formData: FormData) {
  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");
  if (context.rol !== "owner") {
    return { fout: "Alleen de beheerder van het gezin kan dit aanpassen." };
  }

  const provider = (formData.get("provider") === "anthropic" ? "anthropic" : "gemini") as Provider;
  const gekozenModel = String(formData.get("model") ?? "");
  const model = isGeldigModel(provider, gekozenModel) ? gekozenModel : STANDAARD[provider];
  const nieuweSleutel = String(formData.get("api_key") ?? "").trim();
  const verwijderen = formData.get("verwijder_sleutel") === "ja";

  const supabase = await createClient();

  // Geen sleutel meegestuurd? Dan blijft de bestaande staan — het formulier
  // toont hem nooit, dus een leeg veld mag nooit "wissen" betekenen.
  const wijziging: Record<string, unknown> = {
    family_id: context.gezin.id,
    provider,
    model,
    updated_at: new Date().toISOString(),
    updated_by: context.userId,
  };
  if (verwijderen) wijziging.api_key = null;
  else if (nieuweSleutel) wijziging.api_key = nieuweSleutel;

  const { error } = await supabase
    .from("family_ai_config")
    .upsert(wijziging, { onConflict: "family_id" });

  if (error) return { fout: migratieMelding(error, "migratie 005") };

  if (provider === "anthropic" && !nieuweSleutel && !verwijderen) {
    // Vriendelijke waarschuwing: Claude werkt niet zonder eigen sleutel.
    const { data } = await supabase
      .from("family_ai_config")
      .select("api_key")
      .eq("family_id", context.gezin.id)
      .maybeSingle();
    if (!data?.api_key) {
      return { fout: "Claude heeft een eigen API-sleutel nodig. Vul er een in om verder te kunnen." };
    }
  }

  await logActiviteit(supabase, {
    familyId: context.gezin.id,
    actorId: context.userId,
    soort: "voorkeuren_gewijzigd",
    omschrijving: `${context.profiel.naam || "De beheerder"} paste de AI-instellingen aan.`,
  });

  revalidatePath("/instellingen");
  return { gelukt: "Opgeslagen." };
}

export async function logUit() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
