"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

  const haalOp = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("shopping_list_items")
      .select("id, naam, hoeveelheid, eenheid, afgevinkt, bron")
      .eq("family_id", familyId)
      .eq("weekmenu_id", weekmenuId)
      .order("afgevinkt")
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
    await createClient()
      .from("shopping_list_items")
      .update({ afgevinkt: nieuweStaat })
      .eq("id", item.id);
  }

  async function verwijder(item: BoodschapItem) {
    setItems((vorige) => vorige.filter((i) => i.id !== item.id));
    await createClient().from("shopping_list_items").delete().eq("id", item.id);
  }

  async function voegToe(event: React.FormEvent) {
    event.preventDefault();
    const naam = nieuw.trim();
    if (!naam) return;

    setNieuw("");


    const supabase = createClient();
    await supabase.from("shopping_list_items").insert({
      family_id: familyId,
      weekmenu_id: weekmenuId,
      naam,
      bron: "handmatig",
    });
    await haalOp();
  }

  const open = items.filter((i) => !i.afgevinkt);
  const gedaan = items.filter((i) => i.afgevinkt);

  return (
    <div className="max-w-xl space-y-5">
      <form onSubmit={voegToe} className="flex gap-2">
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
      </form>

      {items.length === 0 ? (
        <p className="kaart p-6 text-sm text-inkt-zacht">
          Nog niets te kopen. Zodra er gerechten op het weekmenu staan, verschijnt hier wat er nog
          niet in huis is.
        </p>
      ) : (
        <ul className="kaart divide-y divide-[var(--color-lijn)] overflow-hidden">
          {[...open, ...gedaan].map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                id={`vink-${item.id}`}
                type="checkbox"
                checked={item.afgevinkt}
                onChange={() => void wissel(item)}
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
                onClick={() => void verwijder(item)}
                aria-label={`${item.naam} van de lijst halen`}
                className="shrink-0 text-inkt-zacht hover:text-red-700"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
