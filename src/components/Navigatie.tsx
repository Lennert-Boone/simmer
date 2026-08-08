"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@/components/Avatar";
import Meldingen from "@/components/Meldingen";
import {
  IconBoodschappen,
  IconChevronLinks,
  IconChevronRechts,
  IconVoorraad,
  IconWeekmenu,
} from "@/components/Icons";
import type { Activiteit } from "@/lib/types";

// Instellingen zit niet meer in deze lijst: dat bereik je via je profielfoto.
const LINKS = [
  { href: "/week", label: "Weekmenu", Icon: IconWeekmenu },
  { href: "/voorraad", label: "Voorraad", Icon: IconVoorraad },
  { href: "/boodschappen", label: "Boodschappen", Icon: IconBoodschappen },
] as const;

const OPSLAG_SLEUTEL = "simmer:sidenav-ingeklapt";

export interface ProfielProps {
  familyId: string;
  gezinsnaam: string;
  naam: string | null;
  email: string;
  avatarUrl: string | null;
  meldingen: Activiteit[];
  ongelezen: number;
}

function isActief(pad: string, href: string) {
  // /gerecht/... hoort visueel bij het weekmenu.
  if (href === "/week") return pad.startsWith("/week") || pad.startsWith("/gerecht");
  return pad.startsWith(href);
}

/** Vaste balk onderaan op mobiel. */
export function OnderNav() {
  const pad = usePathname();

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-lijn bg-kaart/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-3">
        {LINKS.map(({ href, label, Icon }) => {
          const actief = isActief(pad, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={actief ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  actief ? "text-kruid" : "text-inkt-zacht"
                }`}
              >
                <Icon className={`h-6 w-6 ${actief ? "" : "opacity-75"}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Inklapbare zijbalk vanaf tablet, met profiel en meldingen onderin. */
export function ZijNav({ profiel }: { profiel: ProfielProps }) {
  const pad = usePathname();
  // Uitgeklapt is de standaard; zo klapt de balk niet zichtbaar om na hydratie.
  const [ingeklapt, setIngeklapt] = useState(false);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    setIngeklapt(localStorage.getItem(OPSLAG_SLEUTEL) === "1");
    setGeladen(true);
  }, []);

  function wissel() {
    setIngeklapt((vorig) => {
      const nieuw = !vorig;
      localStorage.setItem(OPSLAG_SLEUTEL, nieuw ? "1" : "0");
      return nieuw;
    });
  }

  const breed = !ingeklapt;
  const opInstellingen = pad.startsWith("/instellingen");

  return (
    // Sticky in plaats van fixed, zodat de inhoud ernaast automatisch meeschuift
    // wanneer de balk in- of uitklapt.
    <aside
      className={`sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-lijn bg-kaart md:flex ${
        geladen ? "transition-[width] duration-200" : ""
      } ${breed ? "w-60" : "w-[4.5rem]"}`}
    >
      <div className={`flex h-16 items-center border-b border-lijn ${breed ? "px-5" : "justify-center"}`}>
        <Link href="/week" className="flex min-w-0 items-center gap-2">
          <span className="font-slab text-lg font-semibold text-kruid">{breed ? "Simmer" : "S"}</span>
        </Link>
      </div>

      <nav aria-label="Hoofdnavigatie" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {LINKS.map(({ href, label, Icon }) => {
            const actief = isActief(pad, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={actief ? "page" : undefined}
                  title={breed ? undefined : label}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    breed ? "" : "justify-center px-0"
                  } ${
                    actief
                      ? "bg-kruid-licht text-kruid"
                      : "text-inkt-zacht hover:bg-kruid-licht/60 hover:text-kruid"
                  }`}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  {breed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-lijn p-3">
        <button
          type="button"
          onClick={wissel}
          aria-expanded={breed}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-inkt-zacht transition-colors hover:bg-kruid-licht/60 hover:text-kruid ${
            breed ? "" : "justify-center px-0"
          }`}
        >
          {breed ? <IconChevronLinks className="h-5 w-5" /> : <IconChevronRechts className="h-5 w-5" />}
          {breed && <span>Inklappen</span>}
        </button>

        {/* Profiel en meldingen onderin — de plek waar je ze verwacht. */}
        <div className={`flex items-center gap-1 ${breed ? "" : "flex-col"}`}>
          <Link
            href="/instellingen"
            aria-current={opInstellingen ? "page" : undefined}
            title={breed ? undefined : "Je account"}
            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 transition-colors ${
              breed ? "px-3" : "justify-center px-0"
            } ${
              opInstellingen ? "bg-kruid-licht" : "hover:bg-kruid-licht/60"
            }`}
          >
            <Avatar
              naam={profiel.naam}
              email={profiel.email}
              avatarUrl={profiel.avatarUrl}
              formaat={30}
            />
            {breed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {profiel.naam || profiel.email}
                </span>
                <span className="block truncate text-xs text-inkt-zacht">
                  {profiel.gezinsnaam}
                </span>
              </span>
            )}
          </Link>

          <Meldingen
            familyId={profiel.familyId}
            beginItems={profiel.meldingen}
            beginOngelezen={profiel.ongelezen}
            variant="zijbalk"
          />
        </div>
      </div>
    </aside>
  );
}
