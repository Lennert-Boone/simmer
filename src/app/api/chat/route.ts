import { GoogleGenAI, type Content, type FunctionDeclaration } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGezinsContext } from "@/lib/family";
import { regenereerBoodschappenlijst } from "@/lib/shopping";
import { logActiviteit } from "@/lib/activiteit";
import { getRecipeSuggestions } from "@/lib/recipes";
import { dagNaam, dagenVanWeek, vandaagISO, weekLabel } from "@/lib/week";
import type { Ingredient, Maaltijdtype, VoorraadItem, WeekmenuEntry } from "@/lib/types";

// Vercel staat op het gratis Hobby-plan maximaal 60 seconden toe. Een volledige
// week duurt gemeten zo'n 30 à 45 seconden (twee Gemini-beurten), dus dit past —
// maar ruim is het niet. Zit je op Pro, dan mag hier 300.
export const maxDuration = 60;

// Flash-modellen zitten in de gratis laag van de Gemini API en kunnen function
// calling. Let op: gemini-2.5-flash is voor nieuwe sleutels niet meer
// beschikbaar. Overschrijfbaar via GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const WEEKMENU_TOOL: FunctionDeclaration = {
  name: "werk_weekmenu_bij",
  description:
    "Zet gerechten in het weekmenu of haal ze eruit. Gebruik dit zodra je een concreet " +
    "voorstel hebt. Vul alleen de dagen in die je nu wilt wijzigen — dagen die je weglaat " +
    "blijven ongemoeid. Roep dit niet aan als je nog een verduidelijkende vraag stelt.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      gerechten: {
        type: "array",
        description: "De gerechten die op het menu moeten komen. Vervangt een bestaand gerecht op dezelfde dag en hetzelfde maaltijdtype.",
        items: {
          type: "object",
          properties: {
            datum: { type: "string", description: "Datum als YYYY-MM-DD, binnen de huidige week." },
            maaltijdtype: {
              type: "string",
              enum: ["ontbijt", "lunch", "avond"],
              description: "Alleen maaltijdtypes die het gezin wil plannen.",
            },
            titel: { type: "string", description: "Naam van het gerecht, kort en herkenbaar." },
            beschrijving: {
              type: "string",
              description: "Eén of twee zinnen: hoe je het maakt en waarom het bij deze avond past.",
            },
            bereidingstijd_minuten: { type: "integer" },
            porties: { type: "integer" },
            ingredienten: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  naam: { type: "string" },
                  hoeveelheid: { type: "number" },
                  eenheid: {
                    type: "string",
                    description: "Bijvoorbeeld g, ml, stuk, eetlepel, teentje.",
                  },
                },
                required: ["naam", "hoeveelheid", "eenheid"],
              },
            },
          },
          required: ["datum", "maaltijdtype", "titel", "beschrijving", "porties", "ingredienten"],
        },
      },
      verwijder: {
        type: "array",
        description: "Slots die leeg moeten worden gemaakt.",
        items: {
          type: "object",
          properties: {
            datum: { type: "string" },
            maaltijdtype: { type: "string", enum: ["ontbijt", "lunch", "avond"] },
          },
          required: ["datum", "maaltijdtype"],
        },
      },
    },
    required: ["gerechten"],
  },
};

interface ToolGerecht {
  datum: string;
  maaltijdtype: Maaltijdtype;
  titel: string;
  beschrijving?: string;
  bereidingstijd_minuten?: number;
  porties?: number;
  ingredienten?: Ingredient[];
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { fout: "GEMINI_API_KEY ontbreekt. Zet die in .env.local en herstart de server." },
      { status: 500 },
    );
  }

  const { bericht, weekStart } = (await request.json()) as {
    bericht?: string;
    weekStart?: string;
  };
  if (!bericht?.trim()) {
    return NextResponse.json({ fout: "Leeg bericht." }, { status: 400 });
  }

  // Basiel plant in de week die de gebruiker op het scherm heeft staan.
  const context = await getGezinsContext(weekStart);
  if (!context) {
    return NextResponse.json({ fout: "Geen gezin gevonden." }, { status: 401 });
  }

  const supabase = await createClient();
  const { gezin, voorkeuren, weekmenu, userId } = context;

  await supabase.from("chat_messages").insert({
    family_id: gezin.id,
    weekmenu_id: weekmenu.id,
    user_id: userId,
    role: "user",
    content: bericht.trim(),
  });

  const [{ data: voorraad }, { data: entries }, { data: geschiedenis }] = await Promise.all([
    supabase
      .from("pantry_items")
      .select("*")
      .eq("family_id", gezin.id)
      .order("categorie")
      .returns<VoorraadItem[]>(),
    supabase
      .from("weekmenu_entries")
      .select("*")
      .eq("weekmenu_id", weekmenu.id)
      .order("datum")
      .returns<WeekmenuEntry[]>(),
    supabase
      .from("chat_messages")
      .select("role, content")
      .eq("family_id", gezin.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Optionele externe receptenbron; levert niets zolang die niet geconfigureerd is.
  const suggesties = await getRecipeSuggestions({
    gebruikBijVoorkeur: (voorraad ?? []).map((v) => v.naam),
    vermijd: voorkeuren.dieetwensen.map((d) => d.tekst).filter(Boolean),
    kookstijl: voorkeuren.kookstijl_notities,
  });

  const systeem = bouwSysteemPrompt({
    gezinsnaam: gezin.naam,
    weekStartDate: weekmenu.week_start_date,
    maaltijden: voorkeuren.meals_to_plan,
    kookstijl: voorkeuren.kookstijl_notities,
    dieetwensen: voorkeuren.dieetwensen,
    voorraad: voorraad ?? [],
    entries: entries ?? [],
    suggesties: suggesties.map((s) => s.titel),
  });

  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let antwoord = "";
  let menuGewijzigd = false;

  const contents = bouwBerichten(geschiedenis ?? []);
  const basisConfig = {
    systemInstruction: systeem,
    tools: [{ functionDeclarations: [WEEKMENU_TOOL] }],
    // Ruim genomen: een volledige week is zeven gerechten met hun complete
    // ingrediëntenlijst, en bij Gemini tellen de denktokens hierin mee.
    maxOutputTokens: 16000,
  };

  try {
    const respons = await genai.models.generateContent({
      model: MODEL,
      contents,
      config: basisConfig,
    });

    antwoord = respons.text ?? "";

    const aanroepen = (respons.functionCalls ?? []).filter(
      (a) => a.name === "werk_weekmenu_bij",
    );

    for (const aanroep of aanroepen) {
      const gewijzigd = await pasMenuToe(
        supabase,
        weekmenu.id,
        weekmenu.week_start_date,
        voorkeuren.meals_to_plan,
        userId,
        (aanroep.args ?? {}) as { gerechten?: ToolGerecht[]; verwijder?: ToolGerecht[] },
      );
      menuGewijzigd ||= gewijzigd;
    }

    // Gemini geeft in één beurt óf een functie-aanroep óf tekst, nooit allebei:
    // na een menuwijziging staat er dus niets in de chat. We vragen de uitleg in
    // een tweede beurt op. Het terugspelen van de functieuitkomst met
    // `functionCallingConfig: NONE` bleek niet te werken — het model riep de
    // functie dan gewoon opnieuw aan. Zonder tools werkt het wel, dus geven we
    // het gewoon een samenvatting van wat er is toegepast.
    if (aanroepen.length > 0 && antwoord.trim() === "") {
      const uitleg = await vraagUitleg(genai, {
        vraag: bericht.trim(),
        gepland: aanroepen.flatMap((a) =>
          ((a.args?.gerechten ?? []) as ToolGerecht[]).map(
            (g) =>
              `${g.datum} ${g.maaltijdtype}: ${g.titel} (${g.porties ?? 4} porties` +
              `${g.bereidingstijd_minuten ? `, ${g.bereidingstijd_minuten} min` : ""})`,
          ),
        ),
        verwijderd: aanroepen.flatMap((a) =>
          ((a.args?.verwijder ?? []) as ToolGerecht[]).map(
            (s) => `${s.datum} ${s.maaltijdtype} is leeggemaakt`,
          ),
        ),
        gelukt: menuGewijzigd,
      });
      if (uitleg) antwoord = uitleg;
    }
  } catch (fout) {
    console.error("Gemini-aanroep mislukt:", fout);
    const melding =
      fout instanceof Error && /quota|rate|RESOURCE_EXHAUSTED/i.test(fout.message)
        ? "De gratis daglimiet van Gemini is bereikt. Probeer het morgen opnieuw."
        : "De assistent is even niet bereikbaar. Probeer het zo opnieuw.";
    return NextResponse.json({ fout: melding }, { status: 502 });
  }

  if (menuGewijzigd) {
    await regenereerBoodschappenlijst(supabase, gezin.id, weekmenu.id);
    await logActiviteit(supabase, {
      familyId: gezin.id,
      actorId: null, // Basiel
      soort: "menu_bijgewerkt",
      omschrijving: `Basiel werkte het menu van ${weekLabel(weekmenu.week_start_date)} bij, op vraag van ${
        context.profiel.naam || "een gezinslid"
      }.`,
      meta: { week: weekmenu.week_start_date },
    });
  }

  const tekst = antwoord.trim() || "Het weekmenu is bijgewerkt.";
  await supabase.from("chat_messages").insert({
    family_id: gezin.id,
    weekmenu_id: weekmenu.id,
    user_id: null,
    role: "assistant",
    content: tekst,
  });

  return NextResponse.json({ antwoord: tekst, menuGewijzigd });
}

// ---------------------------------------------------------------------------

/**
 * Tweede beurt: puur tekst, bewust zonder tools zodat het model niets meer kan
 * wijzigen en gegarandeerd een antwoord in woorden geeft.
 */
async function vraagUitleg(
  genai: GoogleGenAI,
  input: { vraag: string; gepland: string[]; verwijderd: string[]; gelukt: boolean },
): Promise<string | null> {
  if (!input.gelukt) {
    return "Ik kon het menu niet bijwerken — de dagen die ik voorstelde vielen buiten deze week. Probeer het nog eens.";
  }

  const wijzigingen = [...input.gepland, ...input.verwijderd].join("\n");

  try {
    const respons = await genai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Je hebt zonet dit in het weekmenu van een gezin gezet:

${wijzigingen}

De gebruiker vroeg: "${input.vraag}"

Schrijf in twee of drie zinnen wat je gedaan hebt en waarom, in gewone Nederlandse spreektaal. Som het menu niet op — dat staat al in het overzicht naast de chat. Spreek de gebruiker aan met "je". Nuchter en concreet, geen uitroeptekens, geen verkooppraat. Noem alleen dingen die echt in de lijst hierboven staan.`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 4000 },
    });

    return respons.text?.trim() || null;
  } catch (fout) {
    // De uitleg is een extraatje: mislukt die, dan is het menu nog steeds bijgewerkt.
    console.error("Uitleg opvragen mislukt:", fout);
    return null;
  }
}

function bouwBerichten(geschiedenis: { role: string; content: string }[]): Content[] {
  // De query levert nieuwste-eerst; draai om en voeg opeenvolgende beurten van
  // dezelfde rol samen, want de API verwacht afwisselende rollen. Gemini noemt
  // de assistent-rol "model".
  const oplopend = [...geschiedenis].reverse();
  const berichten: Content[] = [];

  for (const rij of oplopend) {
    const rol = rij.role === "assistant" ? "model" : "user";
    const laatste = berichten.at(-1);
    if (laatste?.role === rol && laatste.parts?.[0]) {
      laatste.parts[0].text = `${laatste.parts[0].text}\n\n${rij.content}`;
    } else {
      berichten.push({ role: rol, parts: [{ text: rij.content }] });
    }
  }

  // Een gesprek moet met de gebruiker beginnen.
  while (berichten.length > 0 && berichten[0].role !== "user") berichten.shift();
  return berichten;
}

function bouwSysteemPrompt(input: {
  gezinsnaam: string;
  weekStartDate: string;
  maaltijden: Maaltijdtype[];
  kookstijl: string;
  dieetwensen: { naam: string; tekst: string }[];
  voorraad: VoorraadItem[];
  entries: WeekmenuEntry[];
  suggesties: string[];
}): string {
  const dagen = dagenVanWeek(input.weekStartDate);
  const vandaag = vandaagISO();

  const dagenLijst = dagen
    .map((d) => `- ${d} (${dagNaam(d, true)})${d === vandaag ? " ← vandaag" : ""}`)
    .join("\n");

  const voorraadLijst =
    input.voorraad.length === 0
      ? "De voorraadlijst is leeg."
      : input.voorraad
          .map((v) => {
            const houdbaar = v.houdbaar_tot ? ` — houdbaar tot ${v.houdbaar_tot}` : "";
            return `- ${v.naam}: ${v.hoeveelheid} ${v.eenheid} (${v.categorie})${houdbaar}`;
          })
          .join("\n");

  const menuLijst =
    input.entries.length === 0
      ? "Het weekmenu is nog helemaal leeg."
      : input.entries
          .map((e) => `- ${e.datum} ${e.maaltijdtype}: ${e.titel}`)
          .join("\n");

  const dieet =
    input.dieetwensen.filter((d) => d.tekst).length === 0
      ? "Niets opgegeven."
      : input.dieetwensen
          .filter((d) => d.tekst)
          .map((d) => `- ${d.naam || "een gezinslid"}: ${d.tekst}`)
          .join("\n");

  return `Je bent Basiel, de kookhulp van het gezin ${input.gezinsnaam}. Je helpt met het weekmenu voor ${weekLabel(input.weekStartDate)}.

# Wie je bent
Je bent nuchter, warm en praktisch — als een huisgenoot die goed kan koken en meedenkt, niet als een enthousiaste assistent. Je schrijft Nederlands in gewone spreektaal, kort en concreet. Geen uitroeptekens, geen "geweldig!" of "wat leuk!", geen emoji. Je spreekt de gebruiker aan met "je". Als iets niet kan of je twijfelt, zeg je dat gewoon.

# Hoe je werkt
Iemand beschrijft de week in eigen woorden. Jij maakt daar een bruikbaar menu van en zet het meteen in de app met het gereedschap \`werk_weekmenu_bij\`. Het doel is dat er 's avonds vlot gekookt kan worden — geen lang interview.

- Stel hoogstens één of twee verduidelijkende vragen, en alleen als je er echt niet uit komt. Bij twijfel: doe een voorstel en zeg erbij dat het aangepast kan worden.
- Vraagt iemand om een aanpassing ("maandag toch geen vis"), pas dan alleen dat deel aan. Laat de rest van de week staan en stuur alleen de gewijzigde dagen mee.
- Plan alleen deze maaltijdtypes: ${input.maaltijden.join(", ")}.
- Zet \`porties\` per dag op het aantal mensen dat die dag mee-eet. Zegt iemand "zaterdag zijn we met zes" of "woensdag eet ik alleen", pas dan alleen die dag aan. Hoor je niets, ga dan uit van het gebruikelijke aantal.
- Plan alleen binnen deze week, en niet vóór vandaag tenzij er expliciet om gevraagd wordt.
- Na een wijziging: schrijf in twee, drie zinnen wat je gedaan hebt. Som niet het hele menu op — dat staat al in het overzicht naast de chat.

# Harde beperkingen
Dit zijn geen suggesties. Een gerecht met een ingrediënt dat een gezinslid niet eet, plan je nooit — ook niet als variant of bijgerecht.

${dieet}

# Kookstijl van dit gezin
${input.kookstijl || "Niets opgegeven — houd het herkenbaar en haalbaar."}

# Wat er nog in huis is
Verwerk dit waar het kan, en geef voorrang aan wat het eerst over datum gaat. Verzin geen voorraad die er niet staat.

${voorraadLijst}

# De dagen van deze week
${dagenLijst}

# Wat er nu al gepland staat
${menuLijst}
${input.suggesties.length > 0 ? `\n# Suggesties uit de receptenbron\n${input.suggesties.map((s) => `- ${s}`).join("\n")}\n` : ""}
# Ingrediënten
Geef per gerecht een complete ingrediëntenlijst met hoeveelheden voor het aantal porties dat je invult — die lijst wordt automatisch de boodschappenlijst, min wat er al in huis is. Gebruik gewone eenheden: g, ml, stuk, eetlepel, theelepel, teentje, blik, bosje.`;
}

async function pasMenuToe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weekmenuId: string,
  weekStartDate: string,
  toegestaneMaaltijden: Maaltijdtype[],
  userId: string,
  invoer: { gerechten?: ToolGerecht[]; verwijder?: ToolGerecht[] },
): Promise<boolean> {
  const geldigeDagen = new Set(dagenVanWeek(weekStartDate));
  const geldigeMaaltijden = new Set(toegestaneMaaltijden);

  const isGeldig = (g: { datum?: string; maaltijdtype?: string }) =>
    Boolean(g?.datum) &&
    geldigeDagen.has(g.datum!) &&
    geldigeMaaltijden.has(g.maaltijdtype as Maaltijdtype);

  let gewijzigd = false;

  const teVerwijderen = (invoer.verwijder ?? []).filter(isGeldig);
  for (const slot of teVerwijderen) {
    const { error } = await supabase
      .from("weekmenu_entries")
      .delete()
      .eq("weekmenu_id", weekmenuId)
      .eq("datum", slot.datum)
      .eq("maaltijdtype", slot.maaltijdtype);
    if (!error) gewijzigd = true;
  }

  const rijen = (invoer.gerechten ?? [])
    .filter((g) => isGeldig(g) && g.titel?.trim())
    .map((g) => ({
      weekmenu_id: weekmenuId,
      datum: g.datum,
      maaltijdtype: g.maaltijdtype,
      titel: g.titel.trim(),
      beschrijving: g.beschrijving?.trim() ?? "",
      ingredienten: (g.ingredienten ?? [])
        .filter((i) => i?.naam)
        .map((i) => ({
          naam: String(i.naam).trim(),
          hoeveelheid: Number(i.hoeveelheid) || 1,
          eenheid: String(i.eenheid || "stuk").trim(),
        })),
      porties: Math.max(1, Math.round(Number(g.porties) || 4)),
      bereidingstijd_minuten:
        g.bereidingstijd_minuten != null ? Math.round(Number(g.bereidingstijd_minuten)) : null,
      bron: "ai_generated" as const,
      created_by: userId,
    }));

  if (rijen.length > 0) {
    const { error } = await supabase
      .from("weekmenu_entries")
      .upsert(rijen, { onConflict: "weekmenu_id,datum,maaltijdtype" });
    if (error) {
      console.error("Weekmenu bijwerken mislukt:", error);
    } else {
      gewijzigd = true;
    }
  }

  return gewijzigd;
}
