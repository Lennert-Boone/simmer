"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconBasiel, IconBel, IconSluiten } from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import type { Activiteit } from "@/lib/types";

/** "3 min geleden", "gisteren", "12 aug" — kort genoeg voor een lijstje. */
function geleden(iso: string): string {
  const seconden = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconden < 60) return "net";
  const minuten = Math.floor(seconden / 60);
  if (minuten < 60) return `${minuten} min geleden`;
  const uren = Math.floor(minuten / 60);
  if (uren < 24) return `${uren} uur geleden`;
  const dagen = Math.floor(uren / 24);
  if (dagen === 1) return "gisteren";
  if (dagen < 7) return `${dagen} dagen geleden`;
  return new Date(iso).toLocaleDateString("nl-BE", { day: "numeric", month: "short" });
}

export default function Meldingen({
  familyId,
  beginItems,
  beginOngelezen,
  variant,
}: {
  familyId: string;
  beginItems: Activiteit[];
  beginOngelezen: number;
  /** "mobiel" hangt in de bovenbalk, "zijbalk" onderin de navigatie. */
  variant: "mobiel" | "zijbalk";
}) {
  const [items, setItems] = useState(beginItems);
  const [ongelezen, setOngelezen] = useState(beginOngelezen);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const haalOp = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("activiteit")
      .select("id, soort, omschrijving, actor_id, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (data) setItems(data as Activiteit[]);
  }, [familyId]);

  // Nieuwe activiteit laat het belletje meteen oplopen.
  useEffect(() => {
    const supabase = createClient();
    const kanaal = supabase
      .channel(`activiteit-${familyId}-${variant}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activiteit",
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          setOngelezen((n) => n + 1);
          void haalOp();
        },
      )
      .subscribe();

    return () => void supabase.removeChannel(kanaal);
  }, [familyId, haalOp, variant]);

  // Klik buiten het paneel sluit het (alleen nodig voor de zwevende varianten).
  useEffect(() => {
    if (!open) return;
    const opKlik = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const opToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", opKlik);
    document.addEventListener("keydown", opToets);
    return () => {
      document.removeEventListener("mousedown", opKlik);
      document.removeEventListener("keydown", opToets);
    };
  }, [open]);

  async function wisselOpen() {
    const nieuw = !open;
    setOpen(nieuw);
    if (!nieuw) return;

    await haalOp();
    if (ongelezen === 0) return;

    // Openen telt als gelezen.
    setOngelezen(0);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("family_members")
      .update({ meldingen_gelezen_op: new Date().toISOString() })
      .eq("family_id", familyId)
      .eq("user_id", user.id);
  }

  const badge =
    ongelezen > 0 ? (
      <span
        aria-hidden="true"
        className="cijfer absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-saffraan px-1 text-[10px] font-medium text-inkt"
      >
        {ongelezen > 9 ? "9+" : ongelezen}
      </span>
    ) : null;

  const paneelPositie =
    variant === "mobiel"
      ? "fixed inset-x-3 top-16 max-h-[70dvh]"
      : "absolute bottom-0 left-full z-50 ml-3 max-h-[70dvh] w-[22rem]";

  return (
    <div ref={wrapperRef} className={variant === "zijbalk" ? "relative" : undefined}>
      <button
        type="button"
        onClick={() => void wisselOpen()}
        aria-label={
          ongelezen > 0 ? `Meldingen, ${ongelezen} ongelezen` : "Meldingen"
        }
        aria-expanded={open}
        className={
          variant === "mobiel"
            ? "relative flex h-10 w-10 items-center justify-center rounded-lg text-inkt-zacht transition-colors hover:bg-kruid-licht hover:text-kruid"
            : "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-inkt-zacht transition-colors hover:bg-kruid-licht hover:text-kruid"
        }
      >
        <IconBel className="h-[22px] w-[22px]" />
        {badge}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Meldingen"
          className={`animeer-op z-50 flex flex-col overflow-hidden rounded-xl border border-lijn bg-kaart shadow-xl ${paneelPositie}`}
        >
          <div className="flex items-center justify-between border-b border-lijn px-4 py-3">
            <h2 className="text-base">Wat er veranderde</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-inkt-zacht hover:bg-kruid-licht hover:text-kruid"
            >
              <IconSluiten className="h-4 w-4" />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-inkt-zacht">
              Nog niets gebeurd. Zodra iemand het menu aanpast of Basiel een week inplant, zie je
              dat hier.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-lijn)] overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-3">
                  {item.actor_id === null && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kruid-licht text-kruid">
                      <IconBasiel className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.omschrijving}</p>
                    <p className="cijfer mt-0.5 text-xs text-inkt-zacht">
                      {geleden(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
