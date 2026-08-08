"use client";

import { useCallback, useEffect, useState } from "react";

export default function ReceptStappen({
  entryId,
  beginStappen,
}: {
  entryId: string;
  beginStappen: string[];
}) {
  const [stappen, setStappen] = useState(beginStappen);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [afgevinkt, setAfgevinkt] = useState<Set<number>>(new Set());

  const haalOp = useCallback(
    async (opnieuw: boolean) => {
      setBezig(true);
      setFout(null);
      try {
        const respons = await fetch("/api/recept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId, opnieuw }),
        });
        const data = await respons.json();
        if (!respons.ok) throw new Error(data?.fout ?? "Er ging iets mis.");
        setStappen(data.stappen);
        setAfgevinkt(new Set());
      } catch (probleem) {
        setFout(probleem instanceof Error ? probleem.message : "Er ging iets mis.");
      } finally {
        setBezig(false);
      }
    },
    [entryId],
  );

  // Nog geen bereidingswijze opgeslagen? Haal die op zodra de pagina opent.
  useEffect(() => {
    if (beginStappen.length === 0) void haalOp(false);
    // Alleen bij het openen van dit gerecht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  function wissel(i: number) {
    setAfgevinkt((vorige) => {
      const nieuw = new Set(vorige);
      if (nieuw.has(i)) nieuw.delete(i);
      else nieuw.add(i);
      return nieuw;
    });
  }

  if (stappen.length === 0) {
    return (
      <div className="kaart p-5">
        {bezig ? (
          <p className="text-sm text-inkt-zacht">Basiel schrijft het recept uit…</p>
        ) : fout ? (
          <>
            <p role="alert" className="text-sm text-red-800">
              {fout}
            </p>
            <button
              type="button"
              onClick={() => void haalOp(false)}
              className="knop-stil mt-3 px-3 py-2 text-sm"
            >
              Opnieuw proberen
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void haalOp(false)}
            className="knop-primair px-4 py-2.5 text-sm"
          >
            Recept ophalen
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <ol className="space-y-3">
        {stappen.map((stap, i) => {
          const klaar = afgevinkt.has(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => wissel(i)}
                aria-pressed={klaar}
                className={`kaart flex w-full gap-4 p-4 text-left transition-opacity ${
                  klaar ? "opacity-50" : ""
                }`}
              >
                <span
                  className={`cijfer flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                    klaar ? "bg-kruid text-white" : "bg-kruid-licht text-kruid"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`leading-relaxed ${klaar ? "line-through" : ""}`}>{stap}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void haalOp(true)}
          disabled={bezig}
          className="text-sm text-kruid underline underline-offset-4 disabled:opacity-50"
        >
          {bezig ? "Bezig…" : "Ander recept voorstellen"}
        </button>
        {afgevinkt.size > 0 && (
          <button
            type="button"
            onClick={() => setAfgevinkt(new Set())}
            className="text-sm text-inkt-zacht underline underline-offset-4"
          >
            Vinkjes wissen
          </button>
        )}
      </div>

      {fout && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}
    </div>
  );
}
