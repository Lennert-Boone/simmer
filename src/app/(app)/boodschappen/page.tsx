import { redirect } from "next/navigation";
import { herbouwBoodschappenlijst } from "@/app/actions";
import ShoppingList from "@/components/ShoppingList";
import WeekNav from "@/components/WeekNav";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import type { BoodschapItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BoodschappenPagina({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const context = await getGezinsContext(week);
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("shopping_list_items")
    .select("id, naam, hoeveelheid, eenheid, afgevinkt, bron")
    .eq("family_id", context.gezin.id)
    .eq("weekmenu_id", context.weekmenu.id)
    .order("afgevinkt")
    .order("naam")
    .returns<BoodschapItem[]>();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl">Boodschappen</h1>
        <p className="mt-1 text-inkt-zacht">
          Wat het weekmenu vraagt, min wat er al in de voorraad staat.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <WeekNav
          weekStart={context.weekmenu.week_start_date}
          weekStartDay={context.voorkeuren.week_start_day}
          basisPad="/boodschappen"
        />
        <form action={herbouwBoodschappenlijst}>
          <input type="hidden" name="week" value={context.weekmenu.week_start_date} />
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
