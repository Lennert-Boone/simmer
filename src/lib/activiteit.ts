import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiviteitSoort } from "@/lib/types";

/**
 * Schrijft één regel in het gezinslogboek. Bewust "fire and forget": een
 * mislukte melding mag nooit de actie eronder laten falen — het weekmenu
 * bijwerken is belangrijker dan het belletje.
 *
 * Voorraadwijzigingen worden hier expliciet níét gelogd. Met "+1 melk" per tik
 * loopt de lijst binnen een dag vol en kijkt niemand er nog naar.
 */
export async function logActiviteit(
  supabase: SupabaseClient,
  invoer: {
    familyId: string;
    /** null = Basiel deed het */
    actorId: string | null;
    soort: ActiviteitSoort;
    omschrijving: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("activiteit").insert({
      family_id: invoer.familyId,
      actor_id: invoer.actorId,
      soort: invoer.soort,
      omschrijving: invoer.omschrijving,
      meta: invoer.meta ?? {},
    });
  } catch (fout) {
    console.error("Activiteit loggen mislukt:", fout);
  }
}
