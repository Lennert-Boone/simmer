import { redirect } from "next/navigation";
import { logUit, verwijderLid } from "@/app/actions";
import AccountForm from "@/components/AccountForm";
import Avatar from "@/components/Avatar";
import VoorkeurenForm from "@/components/VoorkeurenForm";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import type { Gezinslid } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InstellingenPagina() {
  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: leden } = await supabase
    .from("family_members")
    .select("user_id, role, users(id, email, naam, avatar_url)")
    .eq("family_id", context.gezin.id)
    .returns<Gezinslid[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl sm:text-3xl">Je account</h1>
      <p className="mt-1 mb-6 text-inkt-zacht">{context.gezin.naam}</p>

      <section className="mb-8">
        <AccountForm
          userId={context.userId}
          naam={context.profiel.naam}
          email={context.profiel.email}
          avatarUrl={context.profiel.avatarUrl}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg">Gezinsleden</h2>
        <ul className="kaart divide-y divide-[var(--color-lijn)] overflow-hidden">
          {(leden ?? []).map((lid) => (
            <li key={lid.user_id} className="flex items-center gap-3 px-4 py-3">
              <Avatar
                naam={lid.users?.naam ?? null}
                email={lid.users?.email ?? ""}
                avatarUrl={lid.users?.avatar_url ?? null}
                formaat={36}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">{lid.users?.naam || lid.users?.email}</p>
                <p className="truncate text-sm text-inkt-zacht">{lid.users?.email}</p>
              </div>
              <span className="cijfer shrink-0 rounded-full bg-kruid-licht px-2.5 py-1 text-[11px] uppercase tracking-widest text-kruid">
                {lid.role === "owner" ? "beheerder" : "lid"}
              </span>
              {context.rol === "owner" && lid.user_id !== context.userId && (
                <form action={verwijderLid}>
                  <input type="hidden" name="user_id" value={lid.user_id} />
                  <button
                    type="submit"
                    className="shrink-0 text-sm text-inkt-zacht underline underline-offset-4 hover:text-red-700"
                  >
                    Verwijderen
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-3 rounded-xl border border-lijn bg-kruid-licht p-4">
          <p className="text-sm font-medium">Uitnodigingscode</p>
          <p className="cijfer mt-1 text-2xl tracking-[0.3em] text-kruid">
            {context.gezin.invite_code}
          </p>
          <p className="mt-1 text-sm text-inkt-zacht">
            Wie deze code invult bij het aanmelden, sluit aan bij jullie gezin.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg">Voorkeuren</h2>
        <VoorkeurenForm voorkeuren={context.voorkeuren} />
      </section>

      <form action={logUit}>
        <button type="submit" className="knop-stil px-4 py-2 text-sm">
          Uitloggen
        </button>
      </form>
    </div>
  );
}
