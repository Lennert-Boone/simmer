"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { vertaalAuthFout } from "@/lib/authFouten";

export default function WachtwoordVergetenForm() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    setBezig(true);
    setFout(null);

    const basis =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${basis}/auth/callback?next=/wachtwoord-herstellen`,
    });

    setBezig(false);
    if (error) {
      setFout(vertaalAuthFout(error.message));
      return;
    }
    setVerstuurd(true);
  }

  if (verstuurd) {
    return (
      <div className="kaart animeer-op p-6">
        <h2 className="text-xl">Kijk in je mailbox</h2>
        <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
          Bestaat er een account met <span className="cijfer">{email}</span>, dan ligt er nu een
          mail klaar met een link om een nieuw wachtwoord in te stellen. Niets gezien? Kijk ook even
          bij je spam.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-kruid underline underline-offset-4"
        >
          Terug naar aanmelden
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={verstuur} className="kaart p-6">
      <h1 className="text-xl">Wachtwoord vergeten</h1>
      <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
        Vul je e-mailadres in, dan sturen we je een link waarmee je een nieuw wachtwoord kunt
        instellen.
      </p>

      <label htmlFor="email" className="mt-5 block text-sm font-medium">
        E-mailadres
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="jij@voorbeeld.be"
        className="veld mt-1.5 w-full"
      />

      <button type="submit" disabled={bezig} className="knop-primair mt-4 w-full py-2.5">
        {bezig ? "Bezig…" : "Stuur me een herstellink"}
      </button>

      {fout && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}

      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-kruid underline underline-offset-4">
          Terug naar aanmelden
        </Link>
      </p>
    </form>
  );
}
