"use client";

import { useActionState, useState } from "react";
import { slaAiConfigOp } from "@/app/actions";
import { MODELLEN, STANDAARD, type Provider } from "@/lib/ai";

const PROVIDERS: { waarde: Provider; label: string; waar: string; url: string }[] = [
  {
    waarde: "gemini",
    label: "Google Gemini",
    waar: "aistudio.google.com/apikey",
    url: "https://aistudio.google.com/apikey",
  },
  {
    waarde: "anthropic",
    label: "Anthropic Claude",
    waar: "console.anthropic.com",
    url: "https://console.anthropic.com",
  },
];

export default function AiInstellingen({
  provider,
  model,
  heeftSleutel,
}: {
  provider: Provider;
  model: string;
  /** De sleutel zelf komt nooit naar de browser — alleen of er één staat. */
  heeftSleutel: boolean;
}) {
  const [staat, actie, bezig] = useActionState(slaAiConfigOp, null);
  const [gekozen, setGekozen] = useState<Provider>(provider);
  const [gekozenModel, setGekozenModel] = useState(model);
  const [sleutelWijzigen, setSleutelWijzigen] = useState(!heeftSleutel);

  const info = PROVIDERS.find((p) => p.waarde === gekozen)!;
  const modellen = MODELLEN[gekozen];

  function wisselProvider(nieuw: Provider) {
    setGekozen(nieuw);
    setGekozenModel(STANDAARD[nieuw]);
  }

  return (
    <form action={actie} className="kaart space-y-5 p-5">
      <div>
        <p className="text-sm font-medium">Welke AI plant jullie menu?</p>
        <p className="mt-1 text-sm text-inkt-zacht">
          Zonder eigen sleutel draait Basiel op de gedeelde Gemini-sleutel met een gratis
          daglimiet. Vul je een eigen sleutel in, dan geldt jouw eigen limiet of tegoed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map((p) => (
          <label
            key={p.waarde}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-lijn px-3 py-2 text-sm has-[:checked]:border-kruid has-[:checked]:bg-kruid-licht"
          >
            <input
              type="radio"
              name="provider"
              value={p.waarde}
              checked={gekozen === p.waarde}
              onChange={() => wisselProvider(p.waarde)}
              className="accent-[var(--color-kruid)]"
            />
            {p.label}
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="ai-model" className="block text-sm font-medium">
          Model
        </label>
        <select
          id="ai-model"
          name="model"
          value={gekozenModel}
          onChange={(e) => setGekozenModel(e.target.value)}
          className="veld mt-1.5 w-full"
        >
          {modellen.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-sm text-inkt-zacht">
          {modellen.find((m) => m.id === gekozenModel)?.toelichting}
        </p>
        {gekozen === "anthropic" && (
          <p className="mt-2 rounded-lg border border-saffraan bg-saffraan-zacht px-3 py-2 text-sm">
            Claude vraagt altijd een eigen sleutel — er is geen gratis laag, en je Claude
            Pro-abonnement kan hier niet voor gebruikt worden.
          </p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="ai-sleutel" className="block text-sm font-medium">
            Eigen API-sleutel
          </label>
          {heeftSleutel && !sleutelWijzigen && (
            <button
              type="button"
              onClick={() => setSleutelWijzigen(true)}
              className="text-xs text-kruid underline underline-offset-4"
            >
              Vervangen
            </button>
          )}
        </div>

        {heeftSleutel && !sleutelWijzigen ? (
          <p className="cijfer mt-1.5 text-sm text-inkt-zacht">•••••••••••••• (ingesteld)</p>
        ) : (
          <>
            <input
              id="ai-sleutel"
              name="api_key"
              type="password"
              autoComplete="off"
              placeholder={gekozen === "anthropic" ? "sk-ant-…" : "AIza…"}
              className="veld mt-1.5 w-full"
            />
            <p className="mt-1.5 text-sm text-inkt-zacht">
              Haal er een op bij{" "}
              <a
                href={info.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-kruid underline underline-offset-4"
              >
                {info.waar}
              </a>
              . Leeg laten betekent: de gedeelde sleutel gebruiken.
            </p>
          </>
        )}

        {heeftSleutel && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-inkt-zacht">
            <input
              type="checkbox"
              name="verwijder_sleutel"
              value="ja"
              className="accent-[var(--color-kruid)]"
            />
            Sleutel verwijderen en terugvallen op de gedeelde sleutel
          </label>
        )}
      </div>

      <button type="submit" disabled={bezig} className="knop-primair w-full py-2.5">
        {bezig ? "Bezig…" : "AI-instellingen opslaan"}
      </button>

      {staat?.fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {staat.fout}
        </p>
      )}
      {staat?.gelukt && (
        <p role="status" className="rounded-lg bg-kruid-licht px-3 py-2 text-sm text-kruid">
          {staat.gelukt}
        </p>
      )}
    </form>
  );
}
