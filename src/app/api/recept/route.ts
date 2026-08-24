import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGezinsContext } from "@/lib/family";
import { getAiConfig } from "@/lib/ai";
import { isLimietFout, vraagAi } from "@/lib/ai/vraag";
import { zoekGerechtFoto } from "@/lib/fotos";
import type { Ingredient, WeekmenuEntry } from "@/lib/types";

// Zie de chatroute: 60 is het maximum op Vercel Hobby. Eén recept haalt dat ruim.
export const maxDuration = 60;

const STAPPEN_SCHEMA = {
  type: "object",
  properties: {
    stappen: { type: "array", items: { type: "string" } },
  },
  required: ["stappen"],
  additionalProperties: false,
} as const;

/**
 * Vult de bereidingswijze én de foto van één gerecht aan. Bewust apart van de
 * menugeneratie: stappen voor zeven gerechten meegenereren maakt elke menuvraag
 * trager en duurder, terwijl je de meeste van die recepten nooit opent.
 */
export async function POST(request: Request) {
  const { entryId, opnieuw } = (await request.json()) as {
    entryId?: string;
    opnieuw?: boolean;
  };
  if (!entryId) return NextResponse.json({ fout: "Geen gerecht opgegeven." }, { status: 400 });

  const context = await getGezinsContext();
  if (!context) return NextResponse.json({ fout: "Geen gezin gevonden." }, { status: 401 });

  const supabase = await createClient();

  // RLS zorgt ervoor dat je alleen gerechten van je eigen gezin ziet.
  const { data: entry } = await supabase
    .from("weekmenu_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle<WeekmenuEntry>();

  if (!entry) return NextResponse.json({ fout: "Gerecht niet gevonden." }, { status: 404 });

  // De foto is losgekoppeld van de stappen: hij komt van een stockbank, kost
  // geen AI-quota, en mag dus ook opgehaald worden als de stappen er al zijn.
  const fotoBelofte =
    entry.foto_url && !opnieuw
      ? Promise.resolve(null)
      : zoekGerechtFoto(entry.titel).then(async (foto) => {
          if (!foto) return null;
          await supabase
            .from("weekmenu_entries")
            .update({ foto_url: foto.url, foto_bron: foto.bron })
            .eq("id", entryId);
          return foto;
        });

  if (!opnieuw && entry.bereidingswijze?.length > 0) {
    const foto = await fotoBelofte;
    return NextResponse.json({
      stappen: entry.bereidingswijze,
      fotoUrl: foto?.url ?? entry.foto_url,
      fotoBron: foto?.bron ?? entry.foto_bron,
    });
  }

  const ingredienten = (entry.ingredienten ?? [])
    .map((i: Ingredient) => `- ${i.naam}: ${i.hoeveelheid} ${i.eenheid}`)
    .join("\n");

  const aiConfig = await getAiConfig(supabase, context.gezin.id);

  try {
    const respons = await vraagAi(aiConfig, {
      systeem:
        "Je schrijft bereidingsplannen voor thuiskoks. Nederlands, gebiedende wijs, geen inleiding en geen afsluiter.",
      berichten: [
        {
          rol: "gebruiker",
          tekst: `Schrijf het bereidingsplan voor dit gerecht.

Gerecht: ${entry.titel}
${entry.beschrijving ? `Omschrijving: ${entry.beschrijving}\n` : ""}Voor ${entry.porties} personen${
            entry.bereidingstijd_minuten ? `, richttijd ${entry.bereidingstijd_minuten} minuten` : ""
          }

Ingrediënten:
${ingredienten || "(niet opgegeven)"}

Regels:
- Zes tot tien stappen. Elke stap één handeling, hooguit twee zinnen.
- Gebruik alleen de ingrediënten hierboven, plus vanzelfsprekende basis als water, zout, peper en bakvet.
- Noem concrete tijden en temperaturen waar dat helpt.
- Geen nummering in de tekst zelf.`,
        },
      ],
      jsonSchema: STAPPEN_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 8000,
    });

    const ruw = respons.tekst.trim();
    if (!ruw) throw new Error("Leeg antwoord van het model.");

    const stappen: string[] = (JSON.parse(ruw).stappen ?? [])
      .map((s: unknown) => String(s).trim())
      .filter(Boolean);

    if (stappen.length === 0) throw new Error("Geen stappen ontvangen.");

    await supabase
      .from("weekmenu_entries")
      .update({ bereidingswijze: stappen, recept_bijgewerkt_op: new Date().toISOString() })
      .eq("id", entryId);

    const foto = await fotoBelofte;
    return NextResponse.json({
      stappen,
      fotoUrl: foto?.url ?? entry.foto_url,
      fotoBron: foto?.bron ?? entry.foto_bron,
    });
  } catch (fout) {
    console.error("Recept genereren mislukt:", fout);
    const melding = isLimietFout(fout)
      ? aiConfig.eigenSleutel
        ? "Je eigen AI-sleutel zit aan zijn limiet."
        : "De gratis daglimiet is bereikt. Vul bij Instellingen een eigen AI-sleutel in, of probeer het morgen opnieuw."
      : "Het recept kon niet worden opgehaald. Probeer het zo opnieuw.";
    return NextResponse.json({ fout: melding }, { status: 502 });
  }
}
