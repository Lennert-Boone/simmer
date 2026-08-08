/**
 * Abstractielaag over receptenbronnen.
 *
 * AI-generatie is het primaire pad: de chat laat het model zelf gerechten
 * bedenken op basis van voorraad en voorkeuren. Deze laag bestaat om later
 * een externe bron (bv. Spoonacular) als *extra* context toe te voegen zonder
 * de kernflow aan te passen — de chatroute roept `getRecipeSuggestions()` aan
 * en geeft het resultaat mee als hint aan het model. Levert de bron niets op,
 * dan verandert er niets aan de flow.
 */

export interface RecipeSuggestion {
  titel: string;
  beschrijving: string;
  ingredienten: { naam: string; hoeveelheid: number; eenheid: string }[];
  bereidingstijdMinuten?: number;
  bron: string;
}

export interface RecipeQuery {
  /** Ingrediënten die bij voorkeur verwerkt worden (uit de voorraad). */
  gebruikBijVoorkeur: string[];
  /** Harde uitsluitingen: allergieën en dieetwensen. */
  vermijd: string[];
  kookstijl?: string;
  aantal?: number;
}

export interface RecipeProvider {
  naam: string;
  beschikbaar(): boolean;
  zoek(query: RecipeQuery): Promise<RecipeSuggestion[]>;
}

/**
 * Placeholder voor een externe recepten-API. Zolang er geen sleutel is
 * geconfigureerd meldt de provider zich als niet-beschikbaar en wordt hij
 * overgeslagen — AI-generatie blijft dan het enige pad.
 */
const externeProvider: RecipeProvider = {
  naam: "extern",
  beschikbaar() {
    return Boolean(process.env.RECIPE_API_KEY);
  },
  async zoek() {
    // Implementatie volgt zodra er een bron gekozen is. Bewust leeg: de
    // kernflow mag hier nooit van afhangen.
    return [];
  },
};

const providers: RecipeProvider[] = [externeProvider];

export async function getRecipeSuggestions(
  query: RecipeQuery,
): Promise<RecipeSuggestion[]> {
  const actief = providers.filter((p) => p.beschikbaar());
  if (actief.length === 0) return [];

  const resultaten = await Promise.all(
    actief.map(async (p) => {
      try {
        return await p.zoek(query);
      } catch (fout) {
        console.error(`Receptenbron "${p.naam}" faalde:`, fout);
        return [];
      }
    }),
  );

  return resultaten.flat().slice(0, query.aantal ?? 8);
}
