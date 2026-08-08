"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

export default function AccountForm({
  userId,
  naam,
  email,
  avatarUrl,
}: {
  userId: string;
  naam: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const bestandRef = useRef<HTMLInputElement>(null);

  const [nieuweNaam, setNieuweNaam] = useState(naam ?? "");
  const [foto, setFoto] = useState(avatarUrl);
  const [bezig, setBezig] = useState<null | "naam" | "foto">(null);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState<string | null>(null);

  function meld(bericht: string) {
    setGelukt(bericht);
    setFout(null);
    setTimeout(() => setGelukt(null), 3000);
  }

  async function slaNaamOp(event: React.FormEvent) {
    event.preventDefault();
    const schoon = nieuweNaam.trim();
    if (!schoon) {
      setFout("Vul een naam in.");
      return;
    }

    setBezig("naam");
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.from("users").update({ naam: schoon }).eq("id", userId);

    setBezig(null);
    if (error) {
      setFout(error.message);
      return;
    }
    meld("Je naam is opgeslagen.");
    router.refresh();
  }

  async function uploadFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const bestand = event.target.files?.[0];
    // Meteen leegmaken, anders kun je hetzelfde bestand niet nog eens kiezen.
    event.target.value = "";
    if (!bestand) return;

    if (!bestand.type.startsWith("image/")) {
      setFout("Kies een afbeelding.");
      return;
    }
    if (bestand.size > MAX_BYTES) {
      setFout("Die foto is groter dan 5 MB. Kies een kleinere.");
      return;
    }

    setBezig("foto");
    setFout(null);

    const supabase = createClient();
    const extensie = bestand.name.split(".").pop()?.toLowerCase() || "jpg";
    // Datum in de bestandsnaam: zo hoeft de browser nooit een oude foto uit
    // z'n cache te vissen.
    const pad = `${userId}/${Date.now()}.${extensie}`;

    const { error: uploadFout } = await supabase.storage
      .from("avatars")
      .upload(pad, bestand, { upsert: true, contentType: bestand.type });

    if (uploadFout) {
      setBezig(null);
      setFout(
        /bucket/i.test(uploadFout.message)
          ? "De opslag voor profielfoto's bestaat nog niet. Draai migratie 004 in Supabase."
          : uploadFout.message,
      );
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(pad);
    const publiekeUrl = data.publicUrl;

    const { error: bewaarFout } = await supabase
      .from("users")
      .update({ avatar_url: publiekeUrl })
      .eq("id", userId);

    if (bewaarFout) {
      setBezig(null);
      setFout(bewaarFout.message);
      return;
    }

    // Oude foto's opruimen, anders blijft elke upload staan.
    const { data: bestaand } = await supabase.storage.from("avatars").list(userId);
    const teVerwijderen = (bestaand ?? [])
      .map((b) => `${userId}/${b.name}`)
      .filter((p) => p !== pad);
    if (teVerwijderen.length > 0) {
      await supabase.storage.from("avatars").remove(teVerwijderen);
    }

    setFoto(publiekeUrl);
    setBezig(null);
    meld("Je profielfoto is bijgewerkt.");
    router.refresh();
  }

  async function verwijderFoto() {
    setBezig("foto");
    setFout(null);

    const supabase = createClient();
    const { data: bestaand } = await supabase.storage.from("avatars").list(userId);
    if (bestaand && bestaand.length > 0) {
      await supabase.storage.from("avatars").remove(bestaand.map((b) => `${userId}/${b.name}`));
    }
    await supabase.from("users").update({ avatar_url: null }).eq("id", userId);

    setFoto(null);
    setBezig(null);
    meld("Je profielfoto is verwijderd.");
    router.refresh();
  }

  return (
    <div className="kaart p-5">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar naam={nieuweNaam || naam} email={email} avatarUrl={foto} formaat={72} />

        <div className="flex flex-wrap gap-2">
          <input
            ref={bestandRef}
            type="file"
            accept="image/*"
            onChange={uploadFoto}
            className="sr-only"
            id="profielfoto"
          />
          <button
            type="button"
            onClick={() => bestandRef.current?.click()}
            disabled={bezig !== null}
            className="knop-stil px-3 py-2 text-sm disabled:opacity-50"
          >
            {bezig === "foto" ? "Bezig…" : foto ? "Andere foto" : "Foto kiezen"}
          </button>
          {foto && (
            <button
              type="button"
              onClick={() => void verwijderFoto()}
              disabled={bezig !== null}
              className="px-2 py-2 text-sm text-inkt-zacht underline underline-offset-4 hover:text-red-700 disabled:opacity-50"
            >
              Verwijderen
            </button>
          )}
        </div>
      </div>

      <form onSubmit={slaNaamOp} className="mt-6">
        <label htmlFor="account-naam" className="block text-sm font-medium">
          Je naam
        </label>
        <p className="mt-1 mb-2 text-sm text-inkt-zacht">
          Zo sta je bij de andere gezinsleden en in de meldingen.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            id="account-naam"
            value={nieuweNaam}
            onChange={(e) => setNieuweNaam(e.target.value)}
            autoComplete="name"
            placeholder="Lennert"
            className="veld min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={bezig !== null || nieuweNaam.trim() === (naam ?? "")}
            className="knop-primair px-4 py-2 text-sm disabled:opacity-40"
          >
            {bezig === "naam" ? "Bezig…" : "Opslaan"}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-lijn pt-4">
        <p className="text-sm font-medium">E-mailadres</p>
        <p className="cijfer mt-1 text-sm text-inkt-zacht">{email}</p>
        <p className="mt-1 text-xs text-inkt-zacht">
          Hiermee log je in. Wil je een ander adres, laat het weten — dat vraagt een bevestiging via
          mail.
        </p>
      </div>

      {fout && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {fout}
        </p>
      )}
      {gelukt && (
        <p role="status" className="mt-4 rounded-lg bg-kruid-licht px-3 py-2 text-sm text-kruid">
          {gelukt}
        </p>
      )}
    </div>
  );
}
