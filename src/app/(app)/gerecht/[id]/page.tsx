import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { verwijderGerecht } from "@/app/actions";
import { IconChevronLinks, IconKlok, IconPersonen } from "@/components/Icons";
import ReceptStappen from "@/components/ReceptStappen";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { dagLabel, dagNaam, weekStart } from "@/lib/week";
import { MAALTIJDTYPES, type WeekmenuEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GerechtPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");

  // RLS beperkt dit al tot gerechten van het eigen gezin.
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("weekmenu_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle<WeekmenuEntry>();

  if (!entry) notFound();

  const maaltijdLabel =
    MAALTIJDTYPES.find((m) => m.waarde === entry.maaltijdtype)?.label ?? entry.maaltijdtype;
  const terugNaarWeek = weekStart(entry.datum, context.voorkeuren.week_start_day);

  return (
    <article className="max-w-3xl">
      <Link
        href={`/week?week=${terugNaarWeek}`}
        className="inline-flex items-center gap-1 text-sm text-inkt-zacht underline-offset-4 hover:text-kruid hover:underline"
      >
        <IconChevronLinks className="h-4 w-4" />
        Terug naar het weekmenu
      </Link>

      <header className="mt-4">
        <p className="cijfer text-xs uppercase tracking-widest text-kruid">
          {dagNaam(entry.datum, true)} {dagLabel(entry.datum).slice(3)}
          {MAALTIJDTYPES.length > 1 && ` · ${maaltijdLabel}`}
        </p>
        <h1 className="mt-1.5 text-3xl sm:text-4xl">{entry.titel}</h1>
        {entry.beschrijving && (
          <p className="mt-3 max-w-prose text-lg leading-relaxed text-inkt-zacht">
            {entry.beschrijving}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-inkt-zacht">
          {entry.bereidingstijd_minuten != null && (
            <span className="flex items-center gap-1.5">
              <IconKlok className="h-4 w-4" />
              <span className="cijfer">{entry.bereidingstijd_minuten} min</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <IconPersonen className="h-4 w-4" />
            <span className="cijfer">{entry.porties} porties</span>
          </span>
        </div>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-[18rem_1fr]">
        <section>
          <h2 className="cijfer mb-3 text-xs uppercase tracking-widest text-inkt-zacht">
            Ingrediënten
          </h2>
          {entry.ingredienten.length === 0 ? (
            <p className="text-sm text-inkt-zacht">Geen ingrediënten opgegeven.</p>
          ) : (
            <ul className="kaart divide-y divide-[var(--color-lijn)] overflow-hidden">
              {entry.ingredienten.map((ing, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm">{ing.naam}</span>
                  <span className="cijfer whitespace-nowrap text-sm text-inkt-zacht">
                    {ing.hoeveelheid} {ing.eenheid}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="cijfer mb-3 text-xs uppercase tracking-widest text-inkt-zacht">
            Bereiding
          </h2>
          <ReceptStappen
            entryId={entry.id}
            beginStappen={entry.bereidingswijze ?? []}
            beginFotoUrl={entry.foto_url ?? null}
            beginFotoBron={entry.foto_bron ?? null}
          />
        </section>
      </div>

      <footer className="mt-10 border-t border-lijn pt-5">
        <form action={verwijderGerecht}>
          <input type="hidden" name="entry_id" value={entry.id} />
          <input type="hidden" name="week" value={terugNaarWeek} />
          <button
            type="submit"
            className="text-sm text-inkt-zacht underline underline-offset-4 hover:text-red-700"
          >
            Dit gerecht van het menu halen
          </button>
        </form>
      </footer>
    </article>
  );
}
