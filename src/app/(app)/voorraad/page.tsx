import { redirect } from "next/navigation";
import PantryList from "@/components/PantryList";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import type { VoorraadItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VoorraadPagina() {
  const context = await getGezinsContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("family_id", context.gezin.id)
    .order("categorie")
    .order("naam")
    .returns<VoorraadItem[]>();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl">Voorraad</h1>
        <p className="mt-1 text-inkt-zacht">
          Wat er in huis is. Werk het bij na het koken — twee tikjes volstaat.
        </p>
      </div>

      <PantryList familyId={context.gezin.id} userId={context.userId} beginItems={items ?? []} />
    </div>
  );
}
