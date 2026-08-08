"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBasiel } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import type { ChatBericht } from "@/lib/types";

const VOORBEELDEN = [
  "Plan de hele week. Woensdag zijn we met z'n tweeën, donderdag hebben we weinig tijd.",
  "Vrijdag komen er gasten eten, iets feestelijks graag.",
  "Maak er een rustige week van, niets dat langer dan een half uur duurt.",
];

export default function Chat({
  familyId,
  weekStart,
  beginBerichten,
}: {
  familyId: string;
  /** De week die op het scherm staat — daar plant Basiel in. */
  weekStart: string;
  beginBerichten: ChatBericht[];
}) {
  const router = useRouter();
  const [berichten, setBerichten] = useState(beginBerichten);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const onderRef = useRef<HTMLDivElement>(null);

  const haalOp = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, user_id, created_at")
      .eq("family_id", familyId)
      .order("created_at")
      .limit(60);
    if (data) setBerichten(data as ChatBericht[]);
  }, [familyId]);

  useEffect(() => {
    const supabase = createClient();
    const kanaal = supabase
      .channel(`chat-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `family_id=eq.${familyId}`,
        },
        () => void haalOp(),
      )
      .subscribe();

    return () => void supabase.removeChannel(kanaal);
  }, [familyId, haalOp]);

  useEffect(() => {
    onderRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [berichten, bezig]);

  async function verstuur(tekst: string) {
    const bericht = tekst.trim();
    if (!bericht || bezig) return;

    setInvoer("");
    setFout(null);
    setBezig(true);
    setBerichten((vorige) => [
      ...vorige,
      {
        id: `tijdelijk-${Date.now()}`,
        role: "user",
        content: bericht,
        user_id: null,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const respons = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bericht, weekStart }),
      });

      const data = await respons.json();
      if (!respons.ok) throw new Error(data?.fout ?? "Er ging iets mis.");

      await haalOp();
      if (data.menuGewijzigd) router.refresh();
    } catch (probleem) {
      setFout(probleem instanceof Error ? probleem.message : "Er ging iets mis.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {berichten.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kruid-licht text-kruid">
                <IconBasiel className="h-5 w-5" />
              </span>
              <p className="rounded-2xl rounded-bl-md bg-kruid-licht px-3.5 py-2.5 text-sm leading-relaxed">
                Dag! Vertel me hoe jullie week eruitziet — wie er wanneer thuis is, welke avond druk
                wordt — dan zet ik er een menu bij.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              {VOORBEELDEN.map((voorbeeld) => (
                <button
                  key={voorbeeld}
                  type="button"
                  onClick={() => void verstuur(voorbeeld)}
                  className="knop-stil block w-full px-3 py-2 text-left text-sm leading-snug"
                >
                  {voorbeeld}
                </button>
              ))}
            </div>
          </div>
        )}

        {berichten.map((bericht) =>
          bericht.role === "user" ? (
            <div key={bericht.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-kruid px-3.5 py-2.5 text-sm leading-relaxed text-white">
                {bericht.content}
              </p>
            </div>
          ) : (
            <div key={bericht.id} className="animeer-op flex gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kruid-licht text-kruid">
                <IconBasiel className="h-5 w-5" />
              </span>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-kruid-licht px-3.5 py-2.5 text-sm leading-relaxed">
                {bericht.content}
              </p>
            </div>
          ),
        )}

        {bezig && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kruid-licht text-kruid">
              <IconBasiel className="h-5 w-5" />
            </span>
            <p className="rounded-2xl rounded-bl-md bg-kruid-licht px-3.5 py-2.5 text-sm text-inkt-zacht">
              Basiel denkt mee…
            </p>
          </div>
        )}

        {fout && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {fout}
          </p>
        )}
        <div ref={onderRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verstuur(invoer);
        }}
        className="flex items-end gap-2 border-t border-lijn p-3"
      >
        <label htmlFor="chat-invoer" className="sr-only">
          Bericht aan Basiel
        </label>
        <textarea
          id="chat-invoer"
          rows={2}
          value={invoer}
          onChange={(e) => setInvoer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void verstuur(invoer);
            }
          }}
          placeholder="Hoe ziet jullie week eruit?"
          className="veld max-h-40 flex-1 resize-none text-sm"
        />
        <button
          type="submit"
          disabled={bezig || !invoer.trim()}
          className="knop-primair px-4 py-2.5 text-sm"
        >
          Stuur
        </button>
      </form>
    </div>
  );
}
