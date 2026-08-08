"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconChevronRechts, IconKlok, IconPersonen } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import { dagLabel, dagNaam, dagenVanWeek, vandaagISO } from "@/lib/week";
import { MAALTIJDTYPES, type Maaltijdtype, type WeekmenuEntry } from "@/lib/types";

export default function WeekOverzicht({
  weekmenuId,
  weekStartDate,
  maaltijden,
  beginEntries,
}: {
  weekmenuId: string;
  weekStartDate: string;
  maaltijden: Maaltijdtype[];
  beginEntries: WeekmenuEntry[];
}) {
  const [entries, setEntries] = useState(beginEntries);
  const [vandaag, setVandaag] = useState<string | null>(null);

  // Pas na hydratie — de server kent de tijdzone van de bezoeker niet.
  useEffect(() => setVandaag(vandaagISO()), []);
  useEffect(() => setEntries(beginEntries), [beginEntries]);

  const haalOp = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("weekmenu_entries")
      .select("*")
      .eq("weekmenu_id", weekmenuId)
      .order("datum");
    if (data) setEntries(data as WeekmenuEntry[]);
  }, [weekmenuId]);

  useEffect(() => {
    const supabase = createClient();
    const kanaal = supabase
      .channel(`weekmenu-${weekmenuId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekmenu_entries",
          filter: `weekmenu_id=eq.${weekmenuId}`,
        },
        () => void haalOp(),
      )
      .subscribe();

    return () => void supabase.removeChannel(kanaal);
  }, [weekmenuId, haalOp]);

  const dagen = dagenVanWeek(weekStartDate);
  const zichtbaar = MAALTIJDTYPES.filter((m) => maaltijden.includes(m.waarde));
  const voorDag = (datum: string) => entries.filter((e) => e.datum === datum);

  const toonVandaag = vandaag !== null && dagen.includes(vandaag);
  const komende = dagen.filter((d) => (toonVandaag ? d > vandaag! : true));
  const voorbij = toonVandaag ? dagen.filter((d) => d < vandaag!) : [];

  return (
    <div className="space-y-8">
      {toonVandaag && (
        <VandaagKaart datum={vandaag!} entries={voorDag(vandaag!)} maaltijden={zichtbaar} />
      )}

      {komende.length > 0 && (
        <section>
          <h2 className="cijfer mb-2 text-xs uppercase tracking-widest text-inkt-zacht">
            {toonVandaag ? "Verder deze week" : "De hele week"}
          </h2>
          <ul className="kaart divide-y divide-[var(--color-lijn)] overflow-hidden">
            {komende.map((datum) => (
              <DagRegel
                key={datum}
                datum={datum}
                entries={voorDag(datum)}
                maaltijden={zichtbaar}
              />
            ))}
          </ul>
        </section>
      )}

      {voorbij.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm text-inkt-zacht underline underline-offset-4 hover:text-kruid">
            Eerder deze week ({voorbij.length})
          </summary>
          <ul className="kaart mt-2 divide-y divide-[var(--color-lijn)] overflow-hidden opacity-60">
            {voorbij.map((datum) => (
              <DagRegel
                key={datum}
                datum={datum}
                entries={voorDag(datum)}
                maaltijden={zichtbaar}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function VandaagKaart({
  datum,
  entries,
  maaltijden,
}: {
  datum: string;
  entries: WeekmenuEntry[];
  maaltijden: { waarde: Maaltijdtype; label: string }[];
}) {
  return (
    <section aria-label={`Vandaag, ${dagLabel(datum)}`} className="animeer-op kaart-vanavond p-5 sm:p-7">
      <div className="relative flex items-baseline justify-between gap-3">
        <div>
          <p className="cijfer text-[11px] uppercase tracking-[0.25em] text-saffraan">Vandaag</p>
          {/* Alleen de dagnaam met een hoofdletter — `capitalize` zou ook "Aug" maken. */}
          <h2 className="mt-0.5 text-xl">
            <span className="capitalize">{dagNaam(datum, true)}</span> {dagLabel(datum).slice(3)}
          </h2>
        </div>
      </div>

      <div className="relative mt-4 space-y-6">
        {maaltijden.map(({ waarde, label }) => {
          const entry = entries.find((e) => e.maaltijdtype === waarde);

          if (!entry) {
            return (
              <div key={waarde}>
                {maaltijden.length > 1 && (
                  <p className="cijfer text-[11px] uppercase tracking-widest text-inkt-zacht">
                    {label}
                  </p>
                )}
                <p className="mt-1 text-inkt-zacht">
                  Nog niets gepland. Vraag Basiel om een voorstel.
                </p>
              </div>
            );
          }

          return (
            <article key={waarde} className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                {maaltijden.length > 1 && (
                  <p className="cijfer text-[11px] uppercase tracking-widest text-inkt-zacht">
                    {label}
                  </p>
                )}
                <h3 className="font-slab text-2xl font-semibold sm:text-3xl">{entry.titel}</h3>

                {entry.beschrijving && (
                  <p className="mt-2 max-w-prose leading-relaxed text-inkt-zacht">
                    {entry.beschrijving}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-inkt-zacht">
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

                <Link
                  href={`/gerecht/${entry.id}`}
                  className="knop-primair mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 text-sm"
                >
                  Recept bekijken
                  <IconChevronRechts className="h-4 w-4" />
                </Link>
              </div>

              {entry.ingredienten.length > 0 && (
                <div className="sm:border-l sm:border-lijn sm:pl-8">
                  <p className="cijfer mb-2 text-[11px] uppercase tracking-widest text-inkt-zacht">
                    Nodig
                  </p>
                  <ul className="space-y-1 text-sm">
                    {entry.ingredienten.map((ing, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span>{ing.naam}</span>
                        <span className="cijfer whitespace-nowrap text-inkt-zacht">
                          {ing.hoeveelheid} {ing.eenheid}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function DagRegel({
  datum,
  entries,
  maaltijden,
}: {
  datum: string;
  entries: WeekmenuEntry[];
  maaltijden: { waarde: Maaltijdtype; label: string }[];
}) {
  const gepland = maaltijden
    .map((m) => ({ label: m.label, entry: entries.find((e) => e.maaltijdtype === m.waarde) }))
    .filter((r) => r.entry);

  return (
    <li>
      {gepland.length === 0 ? (
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="cijfer w-20 shrink-0 text-sm text-inkt-zacht">{dagLabel(datum)}</span>
          <span className="text-sm text-inkt-zacht/70">nog niets gepland</span>
        </div>
      ) : (
        gepland.map(({ label, entry }) => (
          <Link
            key={entry!.id}
            href={`/gerecht/${entry!.id}`}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-kruid-licht/50"
          >
            <span className="cijfer w-20 shrink-0 text-sm text-inkt-zacht">{dagLabel(datum)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{entry!.titel}</span>
              {maaltijden.length > 1 && (
                <span className="text-xs text-inkt-zacht">{label}</span>
              )}
            </span>
            {entry!.bereidingstijd_minuten != null && (
              <span className="cijfer hidden shrink-0 text-xs text-inkt-zacht sm:block">
                {entry!.bereidingstijd_minuten} min
              </span>
            )}
            <IconChevronRechts className="h-4 w-4 shrink-0 text-inkt-zacht" />
          </Link>
        ))
      )}
    </li>
  );
}
