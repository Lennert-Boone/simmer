"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIEEN, type VoorraadItem } from "@/lib/types";

export default function PantryList({
  familyId,
  userId,
  beginItems,
}: {
  familyId: string;
  userId: string;
  beginItems: VoorraadItem[];
}) {
  const [items, setItems] = useState(beginItems);
  const [naam, setNaam] = useState("");
  const [hoeveelheid, setHoeveelheid] = useState("1");
  const [eenheid, setEenheid] = useState("stuk");
  const [categorie, setCategorie] = useState<string>(CATEGORIEEN[0]);
  const [houdbaarTot, setHoudbaarTot] = useState("");
  const [fout, setFout] = useState<string | null>(null);

  const haalOp = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("pantry_items")
      .select("*")
      .eq("family_id", familyId)
      .order("categorie")
      .order("naam");
    if (data) setItems(data as VoorraadItem[]);
  }, [familyId]);

  useEffect(() => {
    const supabase = createClient();
    const kanaal = supabase
      .channel(`voorraad-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pantry_items",
          filter: `family_id=eq.${familyId}`,
        },
        () => void haalOp(),
      )
      .subscribe();

    return () => void supabase.removeChannel(kanaal);
  }, [familyId, haalOp]);

  /** Eén tik = één stap. Direct zichtbaar, daarna pas naar de server. */
  async function pasAan(item: VoorraadItem, stap: number) {
    const nieuw = Math.round((Number(item.hoeveelheid) + stap) * 100) / 100;

    if (nieuw <= 0) {
      setItems((vorige) => vorige.filter((i) => i.id !== item.id));
      await createClient().from("pantry_items").delete().eq("id", item.id);
      return;
    }

    setItems((vorige) =>
      vorige.map((i) => (i.id === item.id ? { ...i, hoeveelheid: nieuw } : i)),
    );
    await createClient()
      .from("pantry_items")
      .update({ hoeveelheid: nieuw, updated_at: new Date().toISOString(), updated_by: userId })
      .eq("id", item.id);
  }

  async function verwijder(item: VoorraadItem) {
    setItems((vorige) => vorige.filter((i) => i.id !== item.id));
    await createClient().from("pantry_items").delete().eq("id", item.id);
  }

  async function voegToe(event: React.FormEvent) {
    event.preventDefault();
    const schoon = naam.trim();
    if (!schoon) return;

    setFout(null);
    setNaam("");


    const supabase = createClient();
    const { error } = await supabase.from("pantry_items").insert({
      family_id: familyId,
      naam: schoon,
      hoeveelheid: Number(hoeveelheid) || 1,
      eenheid: eenheid.trim() || "stuk",
      categorie,
      houdbaar_tot: houdbaarTot || null,
      updated_by: userId,
    });

    if (error) {
      setFout(error.message);
      return;
    }
    setHoudbaarTot("");
    await haalOp();
  }

  const gegroepeerd = useMemo(() => {
    const groepen = new Map<string, VoorraadItem[]>();
    for (const item of items) {
      const lijst = groepen.get(item.categorie) ?? [];
      lijst.push(item);
      groepen.set(item.categorie, lijst);
    }
    return [...groepen.entries()].sort((a, b) => a[0].localeCompare(b[0], "nl"));
  }, [items]);

  const vandaag = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        {gegroepeerd.length === 0 && (
          <p className="kaart p-6 text-sm text-inkt-zacht">
            Nog niets in de voorraad. Voeg toe wat er in de kast staat — de assistent gebruikt het
            om je week mee te plannen.
          </p>
        )}

        {gegroepeerd.map(([groep, groepItems]) => (
          <section key={groep}>
            <h2 className="cijfer mb-2 text-xs uppercase tracking-widest text-inkt-zacht">
              {groep}
            </h2>
            <ul className="kaart divide-y divide-[var(--color-lijn)] overflow-hidden">
              {groepItems.map((item) => {
                const gaatOver = item.houdbaar_tot != null && item.houdbaar_tot <= vandaag;
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.naam}</p>
                      {item.houdbaar_tot && (
                        <p
                          className={`cijfer text-xs ${gaatOver ? "text-saffraan" : "text-inkt-zacht"}`}
                        >
                          houdbaar tot {item.houdbaar_tot}
                        </p>
                      )}
                    </div>

                    <span className="cijfer w-20 shrink-0 text-right text-sm text-inkt-zacht">
                      {item.hoeveelheid} {item.eenheid}
                    </span>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void pasAan(item, -1)}
                        aria-label={`Eén ${item.eenheid} ${item.naam} eraf`}
                        className="knop-stil h-9 w-9 text-lg leading-none"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => void pasAan(item, 1)}
                        aria-label={`Eén ${item.eenheid} ${item.naam} erbij`}
                        className="knop-stil h-9 w-9 text-lg leading-none"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => void verwijder(item)}
                        aria-label={`${item.naam} verwijderen`}
                        className="h-9 w-9 text-inkt-zacht hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <form onSubmit={voegToe} className="kaart h-fit space-y-3 p-5 lg:sticky lg:top-24">
        <h2 className="text-base">Toevoegen</h2>

        <div>
          <label htmlFor="v-naam" className="sr-only">
            Wat
          </label>
          <input
            id="v-naam"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Wat staat er in de kast?"
            className="veld w-full"
          />
        </div>

        <div className="flex gap-2">
          <div className="w-24">
            <label htmlFor="v-hoeveelheid" className="sr-only">
              Hoeveelheid
            </label>
            <input
              id="v-hoeveelheid"
              type="number"
              min="0"
              step="0.1"
              value={hoeveelheid}
              onChange={(e) => setHoeveelheid(e.target.value)}
              className="veld cijfer w-full"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="v-eenheid" className="sr-only">
              Eenheid
            </label>
            <input
              id="v-eenheid"
              value={eenheid}
              onChange={(e) => setEenheid(e.target.value)}
              placeholder="stuk"
              className="veld w-full"
            />
          </div>
        </div>

        <div>
          <label htmlFor="v-categorie" className="sr-only">
            Categorie
          </label>
          <select
            id="v-categorie"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="veld w-full"
          >
            {CATEGORIEEN.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="v-houdbaar" className="block text-xs text-inkt-zacht">
            Houdbaar tot (optioneel)
          </label>
          <input
            id="v-houdbaar"
            type="date"
            value={houdbaarTot}
            onChange={(e) => setHoudbaarTot(e.target.value)}
            className="veld cijfer mt-1 w-full"
          />
        </div>

        <button type="submit" className="knop-primair w-full py-2.5">
          Toevoegen
        </button>
        {fout && <p className="text-sm text-red-700">{fout}</p>}
      </form>
    </div>
  );
}
