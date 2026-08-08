"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GoogleLogo from "@/components/GoogleLogo";
import { createClient } from "@/lib/supabase/client";
import { vertaalAuthFout } from "@/lib/authFouten";

const MIN_WACHTWOORD = 8;

type Tab = "aanmelden" | "registreren";

export default function LoginForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("aanmelden");

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [toonWachtwoord, setToonWachtwoord] = useState(false);

  const [bezig, setBezig] = useState<null | "google" | "formulier">(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bevestigMail, setBevestigMail] = useState(false);

  const basisUrl = () =>
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  function wisselTab(nieuw: Tab) {
    setTab(nieuw);
    setFout(null);
    setWachtwoord("");
  }

  async function metGoogle() {
    setBezig("google");
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${basisUrl()}/auth/callback` },
    });

    // Bij succes navigeert de browser weg; we komen hier alleen bij een fout.
    if (error) {
      setBezig(null);
      setFout(vertaalAuthFout(error.message));
    }
  }

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    setFout(null);

    if (tab === "registreren" && wachtwoord.length < MIN_WACHTWOORD) {
      setFout(`Kies een wachtwoord van minstens ${MIN_WACHTWOORD} tekens.`);
      return;
    }

    setBezig("formulier");
    const supabase = createClient();

    if (tab === "aanmelden") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
      if (error) {
        setBezig(null);
        setFout(vertaalAuthFout(error.message));
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: wachtwoord,
      options: {
        data: { naam: naam.trim() || undefined },
        emailRedirectTo: `${basisUrl()}/auth/callback`,
      },
    });

    if (error) {
      setBezig(null);
      setFout(vertaalAuthFout(error.message));
      return;
    }

    // Staat "Confirm email" aan in Supabase, dan is er nog geen sessie en moet
    // de gebruiker eerst de bevestigingsmail openen.
    if (!data.session) {
      setBezig(null);
      setBevestigMail(true);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (bevestigMail) {
    return (
      <div className="kaart animeer-op p-6">
        <h2 className="text-xl">Bevestig je e-mailadres</h2>
        <p className="mt-2 text-sm leading-relaxed text-inkt-zacht">
          Je account is aangemaakt. We stuurden een bevestigingsmail naar{" "}
          <span className="cijfer">{email}</span>. Klik de link daarin en je kunt aan de slag.
        </p>
        <button
          type="button"
          onClick={() => {
            setBevestigMail(false);
            wisselTab("aanmelden");
          }}
          className="mt-4 text-sm text-kruid underline underline-offset-4"
        >
          Terug naar aanmelden
        </button>
      </div>
    );
  }

  const registreren = tab === "registreren";

  return (
    <div className="kaart p-6">
      <div role="tablist" aria-label="Aanmelden of registreren" className="flex gap-1 rounded-xl bg-kruid-licht p-1">
        {(
          [
            ["aanmelden", "Aanmelden"],
            ["registreren", "Account aanmaken"],
          ] as const
        ).map(([waarde, label]) => (
          <button
            key={waarde}
            type="button"
            role="tab"
            aria-selected={tab === waarde}
            onClick={() => wisselTab(waarde)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === waarde ? "bg-kaart text-kruid shadow-sm" : "text-inkt-zacht"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void metGoogle()}
        disabled={bezig !== null}
        className="knop-stil mt-5 flex w-full items-center justify-center gap-3 py-2.5 font-medium disabled:opacity-50"
      >
        <GoogleLogo />
        {bezig === "google" ? "Even doorsturen…" : "Doorgaan met Google"}
      </button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-lijn" />
        <span className="text-xs uppercase tracking-widest text-inkt-zacht">of</span>
        <span className="h-px flex-1 bg-lijn" />
      </div>

      <form onSubmit={verstuur} className="space-y-3">
        {registreren && (
          <div>
            <label htmlFor="naam" className="block text-sm font-medium">
              Je naam
            </label>
            <input
              id="naam"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              autoComplete="name"
              placeholder="Lennert"
              className="veld mt-1.5 w-full"
            />
            <p className="mt-1 text-xs text-inkt-zacht">
              Zo zien de andere gezinsleden je staan.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
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
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="wachtwoord" className="block text-sm font-medium">
              Wachtwoord
            </label>
            <button
              type="button"
              onClick={() => setToonWachtwoord((v) => !v)}
              className="text-xs text-kruid underline underline-offset-4"
            >
              {toonWachtwoord ? "Verbergen" : "Tonen"}
            </button>
          </div>
          <input
            id="wachtwoord"
            type={toonWachtwoord ? "text" : "password"}
            required
            minLength={registreren ? MIN_WACHTWOORD : undefined}
            autoComplete={registreren ? "new-password" : "current-password"}
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            placeholder={registreren ? `Minstens ${MIN_WACHTWOORD} tekens` : "••••••••"}
            className="veld mt-1.5 w-full"
          />
        </div>

        <button type="submit" disabled={bezig !== null} className="knop-primair w-full py-2.5">
          {bezig === "formulier"
            ? "Bezig…"
            : registreren
              ? "Account aanmaken"
              : "Aanmelden"}
        </button>
      </form>

      {fout && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}

      {!registreren && (
        <p className="mt-4 text-center text-sm">
          <Link href="/wachtwoord-vergeten" className="text-kruid underline underline-offset-4">
            Wachtwoord vergeten?
          </Link>
        </p>
      )}
    </div>
  );
}
