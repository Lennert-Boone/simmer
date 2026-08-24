"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIEEN, categorieVolgorde, categoriseer } from "@/lib/categorieen";
import { createClient } from "@/lib/supabase/client";
import { migratieMelding, ontbrekendeMigratie } from "@/lib/supabase/fouten";
import type { BoodschapItem } from "@/lib/types";

export default function ShoppingList({
  familyId,
  weekmenuId,
  beginItems,
}: {
  familyId: string;
  weekmenuId: string;
  beginItems: BoodschapItem[];
}) {
  const [items, setItems] = useState(beginItems);
  const [nieuw, setNieuw] = useState("");
  const [nieuwCategorie, setNieuwCategorie] = useState<string>("");
  const [fout, setFout] = useState<string | null>(null);

  const haalOp = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("shopping_list_items")
      .select("*")
      .eq("family_id", familyId)
      .eq("weekmenu_id", weekmenuId)
      .order("naam");
    if (data) setItems(data as BoodschapItem[]);
  }, [familyId, weekmenuId]);

  useEffect(() => setItems(beginItems), [beginItems]);

  useEffect(() => {
    const supabase = createClient();
    const kanaal = supabase
      .channel(`boodschappen-${weekmenuId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_list_items",
          filter: `family_id=eq.${familyId}`,
        },
        () => void haalOp(),
      )
      .subscribe();

    return () => void supabase.removeChannel(kanaal);
  }, [familyId, weekmenuId, haalOp]);

  async function wissel(item: BoodschapItem) {
    const nieuweStaat = !item.afgevinkt;
    setItems((vorige) =>
      vorige.map((i) => (i.id === item.id ? { ...i, afgevinkt: nieuweStaat } : i)),
    );
    const { error } = await createClient()
      .from("shopping_list_items")
      .update({ afgevinkt: nieuweStaat })
      .eq("id", item.id);
    if (error) {
      setItems((vorige) =>
        vorige.map((i) => (i.id === item.id ? { ...i, afgevinkt: item.afgevinkt } : i)),
      );
      setFout(migratieMelding(error, "migratie 005"));
    }
  }

  async function verwijder(item: BoodschapItem) {
    setItems((vorige) => vorige.filter((i) => i.id !== item.id));
    const { error } = await createClient()
      .from("shopping_list_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      setItems((vorige) => [...vorige, item]);
      setFout(migratieMelding(error, "migratie 005"));
    }
  }

  async function voegToe(event: React.FormEvent) {
    event.preventDefault();
    const naam = nieuw.trim();
    if (!naam) return;

    // Zelf gekozen categorie wint; anders raden we hem uit de naam.
    const categorie = nieuwCategorie || categoriseer(naam);
    setNieuw("");
    setFout(null);

    const supabase = createClient();
    const basis = {
      family_id: familyId,
      weekmenu_id: weekmenuId,
      naam,
      bron: "handmatig" as const,
    };

    let { error } = await supabase.from("shopping_list_items").insert({ ...basis, categorie });

    // Migratie 005 nog niet gedraaid? Dan bestaat `categorie` niet en zou de
    // hele invoer sneuvelen. Liever een item zonder categorie dan geen item.
    if (error && ontbrekendeMigratie(error)) {
      ({ error } = await supabase.from("shopping_list_items").insert(basis));
    }

    if (error) {
      setNieuw(naam);
      setFout(migratieMelding(error, "migratie 005"));
      return;
    }
    await haalOp();
  }

  /** Per categorie, in winkelvolgorde. Afgevinkte items zakken naar onderen. */
  const groepen = useMemo(() => {
    const open = items.filter((i) => !i.afgevinkt);
    const perCategorie = new Map<string, BoodschapItem[]>();
    for (const item of open) {
      // Zonder migratie 005 komt `categorie` niet uit de database; dan leiden
      // we hem hier af, zodat de groepering hoe dan ook klopt.
      const c = item.categorie || categoriseer(item.naam);
      perCategorie.set(c, [...(perCategorie.get(c) ?? []), item]);
    }
    return [...perCategorie.entries()]
      .sort((a, b) => categorieVolgorde(a[0]) - categorieVolgorde(b[0]))
      .map(([categorie, lijst]) => ({
        categorie,
        lijst: lijst.sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
      }));
  }, [items]);

  const gedaan = items.filter((i) => i.afgevinkt);
  const aantalOpen = items.length - gedaan.length;

  return (
    <div className="max-w-xl space-y-5">
      <form onSubmit={voegToe} className="space-y-2">
        <div className="flex gap-2">
          <label htmlFor="b-nieuw" className="sr-only">
            Zelf iets toevoegen
          </label>
          <input
            id="b-nieuw"
            value={nieuw}
            onChange={(e) => setNieuw(e.target.value)}
            placeholder="Zelf iets toevoegen…"
            className="veld flex-1"
          />
          <button type="submit" className="knop-primair px-4 py-2">
            Toevoegen
          </button>
        </div>
        <label htmlFor="b-categorie" className="sr-only">
          Categorie
        </label>
        <select
          id="b-categorie"
          value={nieuwCategorie}
          onChange={(e) => setNieuwCategorie(e.target.value)}
          className="veld w-full text-sm text-inkt-zacht"
        >
          <option value="">Categorie automatisch bepalen</option>
          {CATEGORIEEN.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </form>

      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}

      {items.length === 0 ? (
        <p className="kaart p-6 text-sm text-inkt-zacht">
          Nog niets te kopen. Zodra er gerechten op het weekmenu staan, verschijnt hier wat er nog
          niet in huis is.
        </p>
      ) : (
        <>
          <p className="cijfer text-xs uppercase tracking-widest text-inkt-zacht">
            {aantalOpen} nog te halen
          </p>

          {groepen.map(({ categorie, lijst }) => (
            <section key={categorie}>
              <h2 className="cijfer mb-2 text-xs uppercase tracking-widest text-kruid">
                {categorie}
              </h2>
              <ul className="kaart divide-y divide-[var(--color-lijn)] overflow-hidden">
                {lijst.map((item) => (
                  <Regel key={item.id} item={item} onWissel={wissel} onVerwijder={verwijder} />
                ))}
              </ul>
            </section>
          ))}

          {gedaan.length > 0 && (
            <details>
              <summary className="cursor-pointer list-none text-sm text-inkt-zacht underline underline-offset-4 hover:text-kruid">
                In het karretje ({gedaan.length})
              </summary>
              <ul className="kaart mt-2 divide-y divide-[var(--color-lijn)] overflow-hidden opacity-60">
                {gedaan.map((item) => (
                  <Regel key={item.id} item={item} onWissel={wissel} onVerwijder={verwijder} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function Regel({
  item,
  onWissel,
  onVerwijder,
}: {
  item: BoodschapItem;
  onWissel: (i: BoodschapItem) => void;
  onVerwijder: (i: BoodschapItem) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <input
        id={`vink-${item.id}`}
        type="checkbox"
        checked={item.afgevinkt}
        onChange={() => void onWissel(item)}
        className="h-5 w-5 shrink-0 accent-[var(--color-kruid)]"
      />
      <label
        htmlFor={`vink-${item.id}`}
        className={`min-w-0 flex-1 cursor-pointer truncate ${
          item.afgevinkt ? "text-inkt-zacht line-through" : ""
        }`}
      >
        {item.naam}
        {item.bron === "handmatig" && (
          <span className="ml-2 text-xs text-inkt-zacht">zelf toegevoegd</span>
        )}
      </label>
      {item.hoeveelheid != null && (
        <span className="cijfer shrink-0 text-sm text-inkt-zacht">
          {item.hoeveelheid} {item.eenheid}
        </span>
      )}
      <button
        type="button"
        onClick={() => void onVerwijder(item)}
        aria-label={`${item.naam} van de lijst halen`}
        className="shrink-0 text-inkt-zacht hover:text-red-700"
      >
        ×
      </button>
    </li>
  );
}
