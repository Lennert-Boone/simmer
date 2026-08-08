/**
 * Iconen als inline SVG — geen extra afhankelijkheid, en ze erven de tekstkleur.
 * Alle iconen delen hetzelfde 24×24-raster en lijngewicht.
 */
type IconProps = { className?: string };

const basis = "h-6 w-6";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? basis}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Kalender met een streepje per dag — het weekmenu. */
export function IconWeekmenu(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7 14h4M7 17.5h6" />
    </Svg>
  );
}

/** Voorraadpot met deksel. */
export function IconVoorraad(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h10M6.5 7h11" />
      <path d="M6 9.5c0-1.4 1.1-2.5 2.5-2.5h7c1.4 0 2.5 1.1 2.5 2.5v9c0 1.4-1.1 2.5-2.5 2.5h-7C7.1 21 6 19.9 6 18.5z" />
      <path d="M9.5 12.5h5" />
    </Svg>
  );
}

/** Boodschappenmandje. */
export function IconBoodschappen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8.5h17l-1.6 10a2 2 0 0 1-2 1.7H7.1a2 2 0 0 1-2-1.7z" />
      <path d="M8.5 8.5 11 3.5M15.5 8.5 13 3.5" />
      <path d="M10 12.5v4M14 12.5v4" />
    </Svg>
  );
}

/** Instellingen — schuifregelaars in plaats van het zoveelste tandwiel. */
export function IconInstellingen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </Svg>
  );
}

/** Blaadje — Basiel, de kookhulp. */
export function IconBasiel(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21c0-5 1.6-8.4 5-10.5" />
      <path d="M19.5 4.2c.6 5.2-1.2 8.6-4.4 9.9-2.2.9-4.3.2-5.2-1.6-1-2 .1-4.3 2.4-5.5 2.2-1.2 5-1.8 7.2-2.8z" />
      <path d="M8.5 21c-.4-3-1.9-4.9-4.5-5.8" />
    </Svg>
  );
}

/** Belletje voor de meldingen. */
export function IconBel(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 4.2-1.3 5.9-2 6.6-.3.3-.1.9.4.9h15.2c.5 0 .7-.6.4-.9-.7-.7-2-2.4-2-6.6z" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconChevronLinks(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Svg>
  );
}

export function IconChevronRechts(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Svg>
  );
}

export function IconSluiten(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconKlok(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  );
}

export function IconPersonen(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.9c2 .6 3.4 2.4 3.4 4.6" />
    </Svg>
  );
}
