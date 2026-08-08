import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, WeekmenuEntry } from "@/lib/types";

// Zie de chatroute: 60 is het maximum op Vercel Hobby. Eén recept haalt dat ruim.
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * Vult de bereidingswijze van één gerecht aan. Bewust apart van de
 * menugeneratie: stappen voor zeven gerechten meegenereren maakt elke
 * menuvraag trager en duurder, terwijl je de meeste van die recepten nooit
 * opent. Nu gebeurt het één keer per gerecht, op het moment dat je het opent.
 */
export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ fout: "GEMINI_API_KEY ontbreekt." }, { status: 500 });
  }

  const { entryId, opnieuw } = (await request.json()) as {
    entryId?: string;
    opnieuw?: boolean;
  };
  if (!entryId) return NextResponse.json({ fout: "Geen gerecht opgegeven." }, { status: 400 });

  const supabase = await createClient();

  // RLS zorgt ervoor dat je alleen gerechten van je eigen gezin ziet.
  const { data: entry } = await supabase
    .from("weekmenu_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle<WeekmenuEntry>();

  if (!entry) return NextResponse.json({ fout: "Gerecht niet gevonden." }, { status: 404 });

  if (!opnieuw && entry.bereidingswijze?.length > 0) {
    return NextResponse.json({ stappen: entry.bereidingswijze });
  }

  const ingredienten = (entry.ingredienten ?? [])
    .map((i: Ingredient) => `- ${i.naam}: ${i.hoeveelheid} ${i.eenheid}`)
    .join("\n");

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const respons = await genai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Schrijf het bereidingsplan voor dit gerecht.

Gerecht: ${entry.titel}
${entry.beschrijving ? `Omschrijving: ${entry.beschrijving}\n` : ""}Voor ${entry.porties} personen${
                entry.bereidingstijd_minuten ? `, richttijd ${entry.bereidingstijd_minuten} minuten` : ""
              }

Ingrediënten:
${ingredienten || "(niet opgegeven)"}

Regels:
- Nederlands, in de gebiedende wijs ("Snijd de ui fijn").
- Zes tot tien stappen. Elke stap één handeling, hooguit twee zinnen.
- Gebruik alleen de ingrediënten hierboven, plus vanzelfsprekende basis als water, zout, peper en bakvet.
- Noem concrete tijden en temperaturen waar dat helpt.
- Geen inleiding, geen afsluiter, geen nummering in de tekst zelf.`,
            },
          ],
        },
      ],
      config: {
        maxOutputTokens: 8000,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            stappen: { type: "array", items: { type: "string" } },
          },
          required: ["stappen"],
        },
      },
    });

    const ruw = respons.text?.trim();
    if (!ruw) throw new Error("Leeg antwoord van het model.");

    const stappen: string[] = (JSON.parse(ruw).stappen ?? [])
      .map((s: unknown) => String(s).trim())
      .filter(Boolean);

    if (stappen.length === 0) throw new Error("Geen stappen ontvangen.");

    await supabase
      .from("weekmenu_entries")
      .update({ bereidingswijze: stappen, recept_bijgewerkt_op: new Date().toISOString() })
      .eq("id", entryId);

    return NextResponse.json({ stappen });
  } catch (fout) {
    console.error("Recept genereren mislukt:", fout);
    const melding =
      fout instanceof Error && /quota|rate|RESOURCE_EXHAUSTED/i.test(fout.message)
        ? "De gratis daglimiet van Gemini is bereikt. Probeer het morgen opnieuw."
        : "Het recept kon niet worden opgehaald. Probeer het zo opnieuw.";
    return NextResponse.json({ fout: melding }, { status: 502 });
  }
}
