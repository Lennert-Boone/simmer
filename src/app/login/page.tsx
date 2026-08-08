import LoginForm from "@/components/LoginForm";

const FOUTMELDINGEN: Record<string, string> = {
  verlopen: "Die link is verlopen of is al gebruikt. Vraag hieronder een nieuwe aan.",
  "ontbrekende-code": "Er ging iets mis bij het terugkeren. Probeer opnieuw aan te melden.",
  geweigerd: "Het aanmelden is afgebroken. Je kunt het gewoon opnieuw proberen.",
};

export default async function LoginPagina({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>;
}) {
  const { fout } = await searchParams;
  const melding = fout ? (FOUTMELDINGEN[fout] ?? FOUTMELDINGEN.geweigerd) : null;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Sfeerkant: dezelfde warme gloed als de vanavond-kaart. Op mobiel zakt
          dit onder het aanmeldformulier, zodat de knop meteen in beeld staat. */}
      <div className="relative order-2 flex flex-col justify-between overflow-hidden bg-kruid px-6 py-10 text-white sm:px-10 lg:order-1 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-40 h-[36rem] w-[36rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-saffraan) 34%, transparent), transparent 62%)",
          }}
        />

        <p className="cijfer relative text-xs uppercase tracking-[0.3em] text-white/70">Simmer</p>

        <div className="relative max-w-md py-8 lg:py-12">
          <h1 className="font-slab text-3xl leading-[1.1] sm:text-4xl lg:text-5xl">
            Wat eten we
            <br />
            deze week?
          </h1>
          <p className="mt-4 leading-relaxed text-white/80 lg:mt-5 lg:text-lg">
            Beschrijf je week in gewone taal — wie is wanneer thuis, welke avond wordt druk — en
            krijg een menu terug dat rekening houdt met wat er nog in huis ligt.
          </p>

          <ul className="mt-6 space-y-2.5 text-white/75 lg:mt-8">
            {[
              "Eén gedeeld weekmenu voor het hele gezin",
              "Houdt je voorraad bij en verwerkt wat over datum gaat",
              "Boodschappenlijst rolt er vanzelf uit",
            ].map((regel) => (
              <li key={regel} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-saffraan" />
                {regel}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">Voor het gezin, op het aanrecht.</p>
      </div>

      {/* Aanmeldkant */}
      <div className="order-1 flex items-center justify-center px-6 py-10 sm:px-10 lg:order-2 lg:py-12">
        <div className="w-full max-w-sm">
          {melding && (
            <p
              role="alert"
              className="mb-5 rounded-lg border border-saffraan bg-saffraan-zacht px-4 py-3 text-sm"
            >
              {melding}
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
