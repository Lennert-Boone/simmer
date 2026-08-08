import { redirect } from "next/navigation";
import { getGezinsContext } from "@/lib/family";
import GezinStart from "@/components/GezinStart";

export default async function OnboardingPagina() {
  const context = await getGezinsContext();
  if (context) redirect("/week");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="cijfer mb-3 text-xs uppercase tracking-widest text-kruid">Aan de slag</p>
      <h1 className="text-3xl">Eerst je gezin</h1>
      <p className="mt-3 text-inkt-zacht">
        Maak een gezin aan en nodig de anderen uit met een code, of sluit aan bij een gezin dat er al
        is.
      </p>

      <div className="mt-8">
        <GezinStart />
      </div>
    </main>
  );
}
