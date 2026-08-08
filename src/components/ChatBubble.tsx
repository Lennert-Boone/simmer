"use client";

import { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat";
import { IconBasiel, IconSluiten } from "@/components/Icons";
import { relatieveWeekNaam } from "@/lib/week";
import type { ChatBericht } from "@/lib/types";

export default function ChatBubble({
  familyId,
  weekStart,
  weekStartDay,
  beginBerichten,
}: {
  familyId: string;
  weekStart: string;
  weekStartDay: number;
  beginBerichten: ChatBericht[];
}) {
  const [open, setOpen] = useState(false);
  const paneelRef = useRef<HTMLDivElement>(null);

  // Escape sluit, en de achtergrond scrollt niet mee op mobiel.
  useEffect(() => {
    if (!open) return;

    const opToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", opToets);
    paneelRef.current?.querySelector<HTMLTextAreaElement>("#chat-invoer")?.focus();

    return () => document.removeEventListener("keydown", opToets);
  }, [open]);

  return (
    <>
      {/* Losse laag boven de onderbalk op mobiel. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat met Basiel openen"
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2.5 rounded-full bg-kruid py-3 pl-3 pr-4 text-white shadow-[0_10px_30px_-8px_rgb(63_107_79_/_0.6)] transition-transform hover:scale-[1.03] md:bottom-6 md:right-6"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <IconBasiel className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">Basiel</span>
        </button>
      )}

      {open && (
        <>
          {/* Alleen op mobiel een blokkerende laag: daar is de chat een
              bottom sheet. Op desktop zweeft het paneel náást de pagina, dus
              moet je gewoon door kunnen klikken terwijl het openstaat. */}
          <div
            className="fixed inset-0 z-40 bg-inkt/25 backdrop-blur-[2px] md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={paneelRef}
            role="dialog"
            aria-label="Chat met Basiel"
            className="animeer-op fixed inset-x-0 bottom-0 z-50 flex h-[80dvh] flex-col overflow-hidden rounded-t-2xl border border-lijn bg-kaart shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[34rem] md:w-[24rem] md:rounded-2xl"
          >
            <div className="flex items-center gap-3 border-b border-lijn px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kruid-licht text-kruid">
                <IconBasiel className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-slab font-semibold leading-tight">Basiel</p>
                <p className="truncate text-xs text-inkt-zacht">
                  Plant in: {relatieveWeekNaam(weekStart, weekStartDay).toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-inkt-zacht transition-colors hover:bg-kruid-licht hover:text-kruid"
              >
                <IconSluiten className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <Chat familyId={familyId} weekStart={weekStart} beginBerichten={beginBerichten} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
