const DAGEN_KORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const DAGEN_LANG = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];
const MAANDEN_KORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

/** Parseert "2026-08-08" naar een lokale Date op het middaguur (DST-veilig). */
export function parseISO(datum: string): Date {
  const [jaar, maand, dag] = datum.split("-").map(Number);
  return new Date(jaar, maand - 1, dag, 12, 0, 0, 0);
}

export function toISO(d: Date): string {
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${maand}-${dag}`;
}

export function vandaagISO(): string {
  return toISO(new Date());
}

export function plusDagen(datum: string, aantal: number): string {
  const d = parseISO(datum);
  d.setDate(d.getDate() + aantal);
  return toISO(d);
}

/**
 * Begin van de week waarin `datum` valt, gegeven de gezinsinstelling
 * (0 = zondag … 6 = zaterdag).
 */
export function weekStart(datum: string, weekStartDay: number): string {
  const d = parseISO(datum);
  const verschil = (d.getDay() - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - verschil);
  return toISO(d);
}

export function dagenVanWeek(startDatum: string): string[] {
  return Array.from({ length: 7 }, (_, i) => plusDagen(startDatum, i));
}

export function dagNaam(datum: string, lang = false): string {
  const dag = parseISO(datum).getDay();
  return lang ? DAGEN_LANG[dag] : DAGEN_KORT[dag];
}

export function dagLabel(datum: string): string {
  const d = parseISO(datum);
  return `${DAGEN_KORT[d.getDay()]} ${d.getDate()} ${MAANDEN_KORT[d.getMonth()]}`;
}

/**
 * Vertaalt een `?week=`-parameter naar een geldige weekstart. Alles wat geen
 * herkenbare datum is valt terug op de huidige week, zodat een verminkte URL
 * nooit een lege pagina oplevert.
 */
export function leesWeekParam(waarde: string | undefined, weekStartDay: number): string {
  const vandaag = vandaagISO();
  if (!waarde || !/^\d{4}-\d{2}-\d{2}$/.test(waarde)) return weekStart(vandaag, weekStartDay);

  const d = parseISO(waarde);
  if (Number.isNaN(d.getTime())) return weekStart(vandaag, weekStartDay);

  // Normaliseren: ook als er een willekeurige dag in de URL staat, tonen we de
  // week waarin die dag valt.
  return weekStart(waarde, weekStartDay);
}

/** Hoeveel weken ligt deze week van de huidige af? 0 = deze week. */
export function weekAfstand(startDatum: string, weekStartDay: number): number {
  const nu = parseISO(weekStart(vandaagISO(), weekStartDay));
  const dan = parseISO(startDatum);
  return Math.round((dan.getTime() - nu.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function relatieveWeekNaam(startDatum: string, weekStartDay: number): string {
  const afstand = weekAfstand(startDatum, weekStartDay);
  if (afstand === 0) return "Deze week";
  if (afstand === 1) return "Volgende week";
  if (afstand === -1) return "Vorige week";
  if (afstand > 1) return `Over ${afstand} weken`;
  return `${Math.abs(afstand)} weken geleden`;
}

export function weekLabel(startDatum: string): string {
  const eind = plusDagen(startDatum, 6);
  const a = parseISO(startDatum);
  const b = parseISO(eind);
  const zelfdeMaand = a.getMonth() === b.getMonth();
  return zelfdeMaand
    ? `${a.getDate()} – ${b.getDate()} ${MAANDEN_KORT[b.getMonth()]}`
    : `${a.getDate()} ${MAANDEN_KORT[a.getMonth()]} – ${b.getDate()} ${MAANDEN_KORT[b.getMonth()]}`;
}
