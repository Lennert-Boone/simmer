import { redirect } from "next/navigation";
import { getGezinsContext } from "@/lib/family";
import VoorkeurenForm from "@/components/VoorkeurenForm";

export default async function VoorkeurenOnboarding() {
  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <p className="cijfer mb-3 text-xs uppercase tracking-widest text-kruid">
        {context.gezin.naam}
      </p>
      <h1 className="text-3xl">Hoe ziet jullie week eruit?</h1>
      <p className="mt-3 mb-8 text-inkt-zacht">
        Je kunt dit later altijd aanpassen bij Instellingen.
      </p>

      <VoorkeurenForm voorkeuren={context.voorkeuren} knopLabel="Klaar, naar het weekmenu" />

      <div className="mt-8 rounded-xl border border-lijn bg-kruid-licht p-4">
        <p className="text-sm font-medium">Nodig de rest van het gezin uit</p>
        <p className="mt-1 text-sm text-inkt-zacht">
          Ze vullen deze code in bij het aanmelden:
        </p>
        <p className="cijfer mt-2 text-2xl tracking-[0.3em] text-kruid">
          {context.gezin.invite_code}
        </p>
      </div>
    </main>
  );
}
