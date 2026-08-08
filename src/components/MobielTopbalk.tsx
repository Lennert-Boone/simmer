import Link from "next/link";
import Avatar from "@/components/Avatar";
import Meldingen from "@/components/Meldingen";
import type { Activiteit } from "@/lib/types";

/** Alleen op mobiel: profiel links, naam in het midden, meldingen rechts. */
export default function MobielTopbalk({
  familyId,
  naam,
  email,
  avatarUrl,
  meldingen,
  ongelezen,
}: {
  familyId: string;
  naam: string | null;
  email: string;
  avatarUrl: string | null;
  meldingen: Activiteit[];
  ongelezen: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-lijn bg-zand/90 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-3">
        <Link
          href="/instellingen"
          aria-label="Naar je account"
          className="flex items-center rounded-full focus-visible:outline-2"
        >
          <Avatar naam={naam} email={email} avatarUrl={avatarUrl} formaat={34} />
        </Link>

        <span className="font-slab text-lg font-semibold text-kruid">Simmer</span>

        <Meldingen
          familyId={familyId}
          beginItems={meldingen}
          beginOngelezen={ongelezen}
          variant="mobiel"
        />
      </div>
    </header>
  );
}
