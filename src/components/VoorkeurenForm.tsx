"use client";

import { useActionState, useState } from "react";
import { slaVoorkeurenOp } from "@/app/actions";
import { MAALTIJDTYPES, type GezinsVoorkeuren } from "@/lib/types";

const DAGEN = [
  { waarde: 0, label: "Zondag" },
  { waarde: 1, label: "Maandag" },
  { waarde: 2, label: "Dinsdag" },
  { waarde: 3, label: "Woensdag" },
  { waarde: 4, label: "Donderdag" },
  { waarde: 5, label: "Vrijdag" },
  { waarde: 6, label: "Zaterdag" },
];

export default function VoorkeurenForm({
  voorkeuren,
  knopLabel = "Opslaan",
}: {
  voorkeuren: GezinsVoorkeuren;
  knopLabel?: string;
}) {
  const [staat, actie, bezig] = useActionState(slaVoorkeurenOp, null);
  const [dieet, setDieet] = useState(
    voorkeuren.dieetwensen.length > 0 ? voorkeuren.dieetwensen : [{ naam: "", tekst: "" }],
  );

  return (
    <form action={actie} className="space-y-6">
      <fieldset className="kaart p-5">
        <legend className="px-1 text-sm font-medium">Welke maaltijden plannen we?</legend>
        <p className="mt-1 mb-3 text-sm text-inkt-zacht">
          De meeste gezinnen plannen enkel het avondeten. Vink aan wat bij jullie ritme past.
        </p>
        <div className="flex flex-wrap gap-2">
          {MAALTIJDTYPES.map(({ waarde, label }) => (
            <label
              key={waarde}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-lijn px-3 py-2 text-sm has-[:checked]:border-kruid has-[:checked]:bg-kruid-licht"
            >
              <input
                type="checkbox"
                name="maaltijden"
                value={waarde}
                defaultChecked={voorkeuren.meals_to_plan.includes(waarde)}
                className="accent-[var(--color-kruid)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="kaart p-5">
        <label htmlFor="week_start_day" className="block text-sm font-medium">
          De week begint op
        </label>
        <select
          id="week_start_day"
          name="week_start_day"
          defaultValue={voorkeuren.week_start_day}
          className="veld mt-2 w-full"
        >
          {DAGEN.map((d) => (
            <option key={d.waarde} value={d.waarde}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="kaart p-5">
        <label htmlFor="vooruit" className="block text-sm font-medium">
          Boodschappenlijst loopt vooruit
        </label>
        <p className="mt-1 mb-2 text-sm text-inkt-zacht">
          Doen jullie zaterdag boodschappen voor de week erna? Zet dit dan op één week, dan opent
          de lijst meteen op de juiste week.
        </p>
        <select
          id="vooruit"
          name="boodschappen_weken_vooruit"
          defaultValue={voorkeuren.boodschappen_weken_vooruit}
          className="veld w-full"
        >
          <option value={0}>Niet — de week die nu loopt</option>
          <option value={1}>Eén week vooruit</option>
          <option value={2}>Twee weken vooruit</option>
        </select>
      </div>

      <div className="kaart p-5">
        <label htmlFor="kookstijl" className="block text-sm font-medium">
          Hoe koken jullie graag?
        </label>
        <p className="mt-1 mb-2 text-sm text-inkt-zacht">
          Vrije tekst. Bijvoorbeeld: &ldquo;liever herkenbare, klassieke gerechten dan exotisch&rdquo;,
          of &ldquo;doordeweeks max 30 minuten&rdquo;.
        </p>
        <textarea
          id="kookstijl"
          name="kookstijl"
          rows={3}
          defaultValue={voorkeuren.kookstijl_notities}
          className="veld w-full resize-y"
        />
      </div>

      <div className="kaart p-5">
        <p className="text-sm font-medium">Allergieën en dieetwensen</p>
        <p className="mt-1 mb-3 text-sm text-inkt-zacht">
          Per gezinslid. Dit wordt als harde beperking gebruikt, niet als suggestie.
        </p>
        <div className="space-y-2">
          {dieet.map((regel, i) => (
            <div key={i} className="flex gap-2">
              <input
                name={`dieet_naam_${i}`}
                defaultValue={regel.naam}
                placeholder="Naam"
                className="veld w-1/3"
              />
              <input
                name={`dieet_tekst_${i}`}
                defaultValue={regel.tekst}
                placeholder="geen noten, eet geen vis"
                className="veld flex-1"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setDieet([...dieet, { naam: "", tekst: "" }])}
          className="mt-3 text-sm text-kruid underline underline-offset-4"
        >
          + Nog een gezinslid
        </button>
      </div>

      {staat?.fout && <p className="text-sm text-red-700">{staat.fout}</p>}

      <button type="submit" disabled={bezig} className="knop-primair w-full py-3">
        {bezig ? "Bezig…" : knopLabel}
      </button>
    </form>
  );
}
