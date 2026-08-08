import { redirect } from "next/navigation";
import { bevestigWeekmenu } from "@/app/actions";
import ChatBubble from "@/components/ChatBubble";
import WeekNav from "@/components/WeekNav";
import WeekOverzicht from "@/components/WeekOverzicht";
import { getGezinsContext } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import type { ChatBericht, WeekmenuEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WeekPagina({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const context = await getGezinsContext(week);
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: entries }, { data: berichten }] = await Promise.all([
    supabase
      .from("weekmenu_entries")
      .select("*")
      .eq("weekmenu_id", context.weekmenu.id)
      .order("datum")
      .returns<WeekmenuEntry[]>(),
    supabase
      .from("chat_messages")
      .select("id, role, content, user_id, created_at")
      .eq("family_id", context.gezin.id)
      .order("created_at")
      .limit(60)
      .returns<ChatBericht[]>(),
  ]);

  const bevestigd = context.weekmenu.status === "bevestigd";

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <WeekNav
          weekStart={context.weekmenu.week_start_date}
          weekStartDay={context.voorkeuren.week_start_day}
          basisPad="/week"
        />
        <form action={bevestigWeekmenu}>
          <input type="hidden" name="week" value={context.weekmenu.week_start_date} />
          <button
            type="submit"
            className={bevestigd ? "knop-stil px-3 py-2 text-sm" : "knop-primair px-3 py-2 text-sm"}
          >
            {bevestigd ? "Bevestigd" : "Menu bevestigen"}
          </button>
        </form>
      </div>

      <WeekOverzicht
        weekmenuId={context.weekmenu.id}
        weekStartDate={context.weekmenu.week_start_date}
        maaltijden={context.voorkeuren.meals_to_plan}
        beginEntries={entries ?? []}
      />

      <ChatBubble
        familyId={context.gezin.id}
        weekStart={context.weekmenu.week_start_date}
        weekStartDay={context.voorkeuren.week_start_day}
        beginBerichten={berichten ?? []}
      />
    </>
  );
}
