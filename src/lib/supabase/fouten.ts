import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Herkent de twee fouten die je krijgt wanneer de code al een migratie
 * veronderstelt die nog niet gedraaid is:
 *
 *   42703   — column X does not exist
 *   PGRST205 — Could not find the table 'public.X' in the schema cache
 *
 * Zonder deze vertaling krijgt de gebruiker de ruwe Supabase-tekst te zien, of
 * — erger — helemaal niets, en lijkt de app gewoon stuk.
 */
export function ontbrekendeMigratie(fout: unknown): boolean {
  if (!fout) return false;
  const code = (fout as PostgrestError).code;
  if (code === "42703" || code === "PGRST205") return true;

  const bericht = fout instanceof Error ? fout.message : String((fout as PostgrestError).message ?? "");
  return /does not exist|schema cache/i.test(bericht);
}

/** Foutmelding die zegt wát er moet gebeuren in plaats van wát er misging. */
export function migratieMelding(fout: unknown, migratie: string): string {
  if (ontbrekendeMigratie(fout)) {
    return `De database mist nog een stuk. Draai ${migratie} in de Supabase SQL Editor.`;
  }
  const bericht =
    fout instanceof Error ? fout.message : String((fout as PostgrestError)?.message ?? "");
  return bericht || "Er ging iets mis.";
}
