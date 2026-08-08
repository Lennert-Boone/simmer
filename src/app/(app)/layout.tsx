import { redirect } from "next/navigation";
import MobielTopbalk from "@/components/MobielTopbalk";
import { OnderNav, ZijNav, type ProfielProps } from "@/components/Navigatie";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import type { Activiteit } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: meldingen }, { count: ongelezen }] = await Promise.all([
    supabase
      .from("activiteit")
      .select("id, soort, omschrijving, actor_id, created_at")
      .eq("family_id", context.gezin.id)
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<Activiteit[]>(),
    supabase
      .from("activiteit")
      .select("id", { count: "exact", head: true })
      .eq("family_id", context.gezin.id)
      .gt("created_at", context.meldingenGelezenOp),
  ]);

  const profiel: ProfielProps = {
    familyId: context.gezin.id,
    gezinsnaam: context.gezin.naam,
    naam: context.profiel.naam,
    email: context.profiel.email,
    avatarUrl: context.profiel.avatarUrl,
    meldingen: meldingen ?? [],
    ongelezen: ongelezen ?? 0,
  };

  return (
    <div className="flex min-h-dvh">
      <ZijNav profiel={profiel} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobielTopbalk
          familyId={context.gezin.id}
          naam={context.profiel.naam}
          email={context.profiel.email}
          avatarUrl={context.profiel.avatarUrl}
          meldingen={meldingen ?? []}
          ongelezen={ongelezen ?? 0}
        />

        {/* pb-24 op mobiel: ruimte voor de vaste balk onderaan. */}
        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 md:pb-10 md:pt-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      <OnderNav />
    </div>
  );
}
