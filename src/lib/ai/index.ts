import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Eén ingang voor alle AI-aanroepen, zodat het gezin zelf kan kiezen waar die
 * naartoe gaan.
 *
 * Over "inloggen met je Claude Pro-abonnement": dat kan niet, en het is geen
 * kwestie van nog niet gebouwd. Claude Pro is een abonnement op claude.ai en
 * Claude Code; er bestaat geen OAuth waarmee een externe app namens jou op dat
 * abonnement mag draaien. Wat wél kan is een eigen API-sleutel invullen — dat
 * is een aparte, per-verbruik afgerekende toegang. Vandaar deze opzet.
 */

export type Provider = "gemini" | "anthropic";

export interface AiConfig {
  provider: Provider;
  model: string;
  apiKey: string;
  /** Komt de sleutel van het gezin zelf, of uit de omgevingsvariabelen? */
  eigenSleutel: boolean;
}

export interface ModelKeuze {
  id: string;
  label: string;
  toelichting: string;
  /** Bruikbaar zonder eigen sleutel? */
  gratisLaag: boolean;
}

export const MODELLEN: Record<Provider, ModelKeuze[]> = {
  gemini: [
    {
      id: "gemini-3.6-flash",
      label: "Gemini 3.6 Flash",
      toelichting: "Snel en sterk. Standaard, werkt op de gratis laag.",
      gratisLaag: true,
    },
    {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash Lite",
      toelichting: "Lichter en zuiniger. Ruimere daglimiet, iets minder scherp.",
      gratisLaag: true,
    },
    {
      id: "gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro",
      toelichting: "Slimmer, maar veel krappere gratis limiet. Eigen sleutel aangeraden.",
      gratisLaag: false,
    },
  ],
  anthropic: [
    {
      id: "claude-haiku-4-5",
      label: "Claude Haiku 4.5",
      toelichting: "Goedkoopste Claude. Ongeveer €0,15 per maand bij wekelijks plannen.",
      gratisLaag: false,
    },
    {
      id: "claude-sonnet-5",
      label: "Claude Sonnet 5",
      toelichting: "Goede balans. Ongeveer €0,45 per maand. Aanrader met eigen sleutel.",
      gratisLaag: false,
    },
    {
      id: "claude-opus-5",
      label: "Claude Opus 5",
      toelichting: "Het slimste. Ongeveer €1,20 per maand.",
      gratisLaag: false,
    },
  ],
};

export const STANDAARD: Record<Provider, string> = {
  gemini: "gemini-3.6-flash",
  anthropic: "claude-sonnet-5",
};

export function isGeldigModel(provider: Provider, model: string): boolean {
  return MODELLEN[provider]?.some((m) => m.id === model) ?? false;
}

/**
 * Haalt de AI-instellingen van het gezin op. Zonder eigen sleutel valt alles
 * terug op de gedeelde Gemini-sleutel uit de omgevingsvariabelen.
 *
 * Let op: leest `family_ai_config`, waar RLS alleen de beheerder toelaat. Voor
 * andere gezinsleden komt hier niets terug en gebruiken we de gedeelde sleutel
 * — dat is precies de bedoeling: zij hoeven de sleutel niet te zien.
 */
export async function getAiConfig(
  supabase: SupabaseClient,
  familyId: string,
): Promise<AiConfig> {
  const gedeeld: AiConfig = {
    provider: "gemini",
    model: process.env.GEMINI_MODEL || STANDAARD.gemini,
    apiKey: process.env.GEMINI_API_KEY ?? "",
    eigenSleutel: false,
  };

  const { data } = await supabase
    .from("family_ai_config")
    .select("provider, model, api_key")
    .eq("family_id", familyId)
    .maybeSingle();

  if (!data?.api_key) {
    // Wel een modelkeuze zonder eigen sleutel? Dan alleen het model overnemen,
    // zolang het bij de gedeelde provider hoort.
    if (data?.provider === "gemini" && data.model && isGeldigModel("gemini", data.model)) {
      return { ...gedeeld, model: data.model };
    }
    return gedeeld;
  }

  const provider = (data.provider === "anthropic" ? "anthropic" : "gemini") as Provider;
  const model =
    data.model && isGeldigModel(provider, data.model) ? data.model : STANDAARD[provider];

  return { provider, model, apiKey: data.api_key, eigenSleutel: true };
}

/**
 * Voert de configuratie uit tegen een gezinssleutel die alleen de server ziet.
 * Bij een ontbrekende sleutel gooien we bewust een leesbare fout, zodat de
 * chatroute er een nette melding van kan maken.
 */
export function vereisSleutel(config: AiConfig): void {
  if (config.apiKey) return;
  throw new Error(
    config.provider === "anthropic"
      ? "Er is geen Anthropic-sleutel ingesteld. Vul er een in bij Instellingen."
      : "Er is geen Gemini-sleutel ingesteld. Vul er een in bij Instellingen, of zet GEMINI_API_KEY in .env.local.",
  );
}
