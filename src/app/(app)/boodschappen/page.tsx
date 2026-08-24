import Link from "next/link";
import { redirect } from "next/navigation";
import { herbouwBoodschappenlijst } from "@/app/actions";
import ShoppingList from "@/components/ShoppingList";
import WeekNav from "@/components/WeekNav";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { plusDagen, relatieveWeekNaam, vandaagISO, weekLabel, weekStart } from "@/lib/week";
import type { BoodschapItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoodschappenPagina({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  // De week bepalen we hier, niet in getGezinsContext: wie zaterdag boodschappen
  // doet, doet dat voor de wéék erna. Zonder expliciete `?week=` springen we dus
  // vooruit met het aantal weken dat het gezin heeft ingesteld.
  const basis = await getGezinsContext(week);
  if (!basis) redirect("/onboarding");

  const vooruit = basis.voorkeuren.boodschappen_weken_vooruit;
  const dezeWeek = weekStart(vandaagISO(), basis.voorkeuren.week_start_day);
  const doelWeek = week ?? plusDagen(dezeWeek, vooruit * 7);

  const context = week ? basis : await getGezinsContext(doelWeek);
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("*")
    .eq("family_id", context.gezin.id)
    .eq("weekmenu_id", context.weekmenu.id)
    .order("naam")
    .returns<BoodschapItem[]>();

  const start = context.weekmenu.week_start_date;
  const isVooruitStandaard = !week && vooruit > 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl">Boodschappen</h1>
        <p className="mt-1 text-inkt-zacht">
          Voor <strong className="font-medium text-inkt">{relatieveWeekNaam(start, context.voorkeuren.week_start_day).toLowerCase()}</strong>
          {" "}({weekLabel(start)}) — wat het menu vraagt, min wat er al in de voorraad staat.
        </p>
        {isVooruitStandaard && (
          <p className="mt-2 text-sm text-inkt-zacht">
            De lijst loopt {vooruit === 1 ? "een week" : `${vooruit} weken`} voor, zodat je
            boodschappen doet voor de week die nog komt.{" "}
            <Link
              href="/instellingen"
              className="text-kruid underline underline-offset-4"
            >
              Aanpassen
            </Link>
          </p>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <WeekNav
          weekStart={start}
          weekStartDay={context.voorkeuren.week_start_day}
          basisPad="/boodschappen"
        />
        <form action={herbouwBoodschappenlijst}>
          <input type="hidden" name="week" value={start} />
          <button type="submit" className="knop-stil px-3 py-2 text-sm">
            Opnieuw berekenen
          </button>
        </form>
      </div>

      <ShoppingList
        familyId={context.gezin.id}
        weekmenuId={context.weekmenu.id}
        beginItems={items ?? []}
      />
    </div>
  );
}
