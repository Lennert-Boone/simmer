import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, type Content } from "@google/genai";
import { vereisSleutel, type AiConfig } from "@/lib/ai";

/**
 * Eén aanroepvorm voor beide providers. De chatroute en de receptroute praten
 * alleen met deze laag, zodat de keuze tussen Gemini en Claude nergens anders
 * doorsijpelt.
 */

export interface AiGereedschap {
  naam: string;
  beschrijving: string;
  /** Gewone JSON Schema; beide providers slikken dit. */
  schema: Record<string, unknown>;
}

export interface AiGesprek {
  systeem: string;
  berichten: { rol: "gebruiker" | "model"; tekst: string }[];
  gereedschap?: AiGereedschap;
  maxTokens?: number;
  /** JSON-schema afdwingen op het antwoord (alleen zonder gereedschap). */
  jsonSchema?: Record<string, unknown>;
}

export interface AiAanroep {
  naam: string;
  argumenten: Record<string, unknown>;
}

export interface AiAntwoord {
  tekst: string;
  aanroepen: AiAanroep[];
}

export async function vraagAi(config: AiConfig, gesprek: AiGesprek): Promise<AiAntwoord> {
  vereisSleutel(config);
  return config.provider === "anthropic"
    ? vraagAnthropic(config, gesprek)
    : vraagGemini(config, gesprek);
}

/** Herkent quota-/limietfouten van beide providers voor een nette melding. */
export function isLimietFout(fout: unknown): boolean {
  const bericht = fout instanceof Error ? fout.message : String(fout);
  return /quota|rate.?limit|RESOURCE_EXHAUSTED|429|credit balance|insufficient/i.test(bericht);
}

/* -------------------------------------------------------------------------- */

async function vraagGemini(config: AiConfig, gesprek: AiGesprek): Promise<AiAntwoord> {
  const genai = new GoogleGenAI({ apiKey: config.apiKey });

  const contents: Content[] = gesprek.berichten.map((b) => ({
    role: b.rol === "model" ? "model" : "user",
    parts: [{ text: b.tekst }],
  }));

  const respons = await genai.models.generateContent({
    model: config.model,
    contents,
    config: {
      systemInstruction: gesprek.systeem,
      maxOutputTokens: gesprek.maxTokens ?? 16000,
      ...(gesprek.gereedschap && {
        tools: [
          {
            functionDeclarations: [
              {
                name: gesprek.gereedschap.naam,
                description: gesprek.gereedschap.beschrijving,
                parametersJsonSchema: gesprek.gereedschap.schema,
              },
            ],
          },
        ],
      }),
      ...(gesprek.jsonSchema && {
        responseMimeType: "application/json",
        responseJsonSchema: gesprek.jsonSchema,
      }),
    },
  });

  return {
    tekst: respons.text ?? "",
    aanroepen: (respons.functionCalls ?? []).map((a) => ({
      naam: a.name ?? "",
      argumenten: (a.args ?? {}) as Record<string, unknown>,
    })),
  };
}

/* -------------------------------------------------------------------------- */

// Effort en denkstand verschillen per model: Haiku 4.5 kent `effort` niet en
// zou een 400 geven. Voor Opus 5 en Sonnet 5 zetten we hem op medium — scheelt
// tokens zonder merkbaar kwaliteitsverlies voor het plannen van een week.
const KENT_EFFORT = new Set(["claude-opus-5", "claude-sonnet-5"]);

async function vraagAnthropic(config: AiConfig, gesprek: AiGesprek): Promise<AiAntwoord> {
  const anthropic = new Anthropic({ apiKey: config.apiKey });

  const messages: Anthropic.MessageParam[] = gesprek.berichten.map((b) => ({
    role: b.rol === "model" ? "assistant" : "user",
    content: b.tekst,
  }));

  const respons = await anthropic.messages.create({
    model: config.model,
    max_tokens: gesprek.maxTokens ?? 16000,
    system: gesprek.systeem,
    messages,
    ...(KENT_EFFORT.has(config.model) && { output_config: { effort: "medium" as const } }),
    ...(gesprek.gereedschap && {
      tools: [
        {
          name: gesprek.gereedschap.naam,
          description: gesprek.gereedschap.beschrijving,
          input_schema: gesprek.gereedschap.schema as Anthropic.Tool["input_schema"],
        },
      ],
    }),
    ...(gesprek.jsonSchema && {
      output_config: {
        ...(KENT_EFFORT.has(config.model) ? { effort: "medium" as const } : {}),
        format: { type: "json_schema" as const, schema: gesprek.jsonSchema },
      },
    }),
  });

  let tekst = "";
  const aanroepen: AiAanroep[] = [];

  for (const blok of respons.content) {
    if (blok.type === "text") tekst += blok.text;
    else if (blok.type === "tool_use") {
      aanroepen.push({
        naam: blok.name,
        argumenten: (blok.input ?? {}) as Record<string, unknown>,
      });
    }
  }

  return { tekst, aanroepen };
}
