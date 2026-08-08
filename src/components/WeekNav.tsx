"use client";

import Link from "next/link";
import { IconChevronLinks, IconChevronRechts } from "@/components/Icons";
import { plusDagen, relatieveWeekNaam, weekAfstand, weekLabel } from "@/lib/week";

export default function WeekNav({
  weekStart,
  weekStartDay,
  basisPad,
}: {
  weekStart: string;
  weekStartDay: number;
  /** De weekkeuze werkt op beide schermen; het type houdt typedRoutes blij. */
  basisPad: "/week" | "/boodschappen";
}) {
  const vorige = plusDagen(weekStart, -7);
  const volgende = plusDagen(weekStart, 7);
  const afstand = weekAfstand(weekStart, weekStartDay);

  const knop =
    "flex h-10 w-10 items-center justify-center rounded-lg border border-lijn bg-kaart text-inkt-zacht transition-colors hover:border-kruid hover:text-kruid";

  return (
    <div className="flex items-center gap-2">
      <Link href={{ pathname: basisPad, query: { week: vorige } }} aria-label="Vorige week" className={knop}>
        <IconChevronLinks className="h-5 w-5" />
      </Link>

      <div className="min-w-0 flex-1 text-center sm:flex-none sm:text-left">
        <p className="cijfer text-xs uppercase tracking-widest text-kruid">
          {weekLabel(weekStart)}
        </p>
        <p className="truncate text-sm font-medium">{relatieveWeekNaam(weekStart, weekStartDay)}</p>
      </div>

      <Link href={{ pathname: basisPad, query: { week: volgende } }} aria-label="Volgende week" className={knop}>
        <IconChevronRechts className="h-5 w-5" />
      </Link>

      {afstand !== 0 && (
        <Link
          href={{ pathname: basisPad }}
          className="ml-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-kruid underline underline-offset-4"
        >
          Naar deze week
        </Link>
      )}
    </div>
  );
}
