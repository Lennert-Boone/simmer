"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { vertaalAuthFout } from "@/lib/authFouten";

const MIN_WACHTWOORD = 8;

export default function WachtwoordHerstellenForm() {
  const router = useRouter();
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaling, setHerhaling] = useState("");
  const [toon, setToon] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    setFout(null);

    if (wachtwoord.length < MIN_WACHTWOORD) {
      setFout(`Kies een wachtwoord van minstens ${MIN_WACHTWOORD} tekens.`);
      return;
    }
    if (wachtwoord !== herhaling) {
      setFout("De twee wachtwoorden zijn niet gelijk.");
      return;
    }

    setBezig(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: wachtwoord });

    if (error) {
      setBezig(false);
      setFout(vertaalAuthFout(error.message));
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={verstuur} className="kaart p-6">
      <h1 className="text-xl">Nieuw wachtwoord</h1>
      <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
        Kies een nieuw wachtwoord. Daarna ben je meteen aangemeld.
      </p>

      <div className="mt-5 flex items-baseline justify-between gap-2">
        <label htmlFor="nieuw" className="block text-sm font-medium">
          Nieuw wachtwoord
        </label>
        <button
          type="button"
          onClick={() => setToon((v) => !v)}
          className="text-xs text-kruid underline underline-offset-4"
        >
          {toon ? "Verbergen" : "Tonen"}
        </button>
      </div>
      <input
        id="nieuw"
        type={toon ? "text" : "password"}
        required
        minLength={MIN_WACHTWOORD}
        autoComplete="new-password"
        value={wachtwoord}
        onChange={(e) => setWachtwoord(e.target.value)}
        placeholder={`Minstens ${MIN_WACHTWOORD} tekens`}
        className="veld mt-1.5 w-full"
      />

      <label htmlFor="herhaal" className="mt-3 block text-sm font-medium">
        Nog een keer
      </label>
      <input
        id="herhaal"
        type={toon ? "text" : "password"}
        required
        autoComplete="new-password"
        value={herhaling}
        onChange={(e) => setHerhaling(e.target.value)}
        className="veld mt-1.5 w-full"
      />

      <button type="submit" disabled={bezig} className="knop-primair mt-4 w-full py-2.5">
        {bezig ? "Bezig…" : "Wachtwoord opslaan"}
      </button>

      {fout && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}
    </form>
  );
}
