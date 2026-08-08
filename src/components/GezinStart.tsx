"use client";

import { useActionState, useState } from "react";
import { maakGezin, treedToe } from "@/app/actions";

export default function GezinStart() {
  const [tab, setTab] = useState<"maken" | "toetreden">("maken");
  const [maakStaat, maakActie, maakBezig] = useActionState(maakGezin, null);
  const [joinStaat, joinActie, joinBezig] = useActionState(treedToe, null);

  return (
    <div>
      <div role="tablist" aria-label="Gezin" className="mb-4 flex gap-1 rounded-xl bg-kruid-licht p-1">
        {(
          [
            ["maken", "Gezin aanmaken"],
            ["toetreden", "Code invullen"],
          ] as const
        ).map(([waarde, label]) => (
          <button
            key={waarde}
            role="tab"
            aria-selected={tab === waarde}
            onClick={() => setTab(waarde)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === waarde ? "bg-kaart text-kruid shadow-sm" : "text-inkt-zacht"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "maken" ? (
        <form action={maakActie} className="kaart p-5">
          <label htmlFor="naam" className="block text-sm font-medium">
            Naam van je gezin
          </label>
          <input
            id="naam"
            name="naam"
            required
            placeholder="Huize Boone"
            className="veld mt-2 w-full"
          />
          <button type="submit" disabled={maakBezig} className="knop-primair mt-4 w-full py-2.5">
            {maakBezig ? "Bezig…" : "Gezin aanmaken"}
          </button>
          {maakStaat?.fout && <p className="mt-3 text-sm text-red-700">{maakStaat.fout}</p>}
        </form>
      ) : (
        <form action={joinActie} className="kaart p-5">
          <label htmlFor="code" className="block text-sm font-medium">
            Uitnodigingscode
          </label>
          <input
            id="code"
            name="code"
            required
            placeholder="A1B2C3"
            autoCapitalize="characters"
            className="veld cijfer mt-2 w-full uppercase tracking-widest"
          />
          <button type="submit" disabled={joinBezig} className="knop-primair mt-4 w-full py-2.5">
            {joinBezig ? "Bezig…" : "Aansluiten"}
          </button>
          {joinStaat?.fout && <p className="mt-3 text-sm text-red-700">{joinStaat.fout}</p>}
        </form>
      )}
    </div>
  );
}
