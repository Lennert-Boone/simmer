/**
 * Foto bij een gerecht.
 *
 * Waarom géén AI-beeldgeneratie als standaard: die modellen staan wél op de
 * sleutel (gemini-3.1-flash-image en verwanten), maar hun gratis quota is in de
 * praktijk meteen op — een testaanroep gaf direct RESOURCE_EXHAUSTED. Eén foto
 * per gerecht zou dus je hele dagbudget opsouperen dat je liever aan het
 * weekmenu besteedt.
 *
 * Daarom een échte foto uit een stockbank als primaire bron: gratis, snel, en
 * je krijgt eten dat er ook als eten uitziet. De match is bij benadering — je
 * krijgt "een" stoofpotje, niet exact jouw stoofpotje.
 */

export interface FotoResultaat {
  url: string;
  bron: string;
}

/** Haalt de kernwoorden uit een gerechtnaam voor een bruikbare zoekopdracht. */
function zoekterm(titel: string): string {
  const ruis = new Set([
    "met", "en", "van", "de", "het", "een", "in", "op", "uit", "à", "op z'n",
    "gebakken", "gekookt", "verse", "snelle", "klassieke", "romige", "huisgemaakte",
  ]);
  const woorden = titel
    .toLowerCase()
    .replace(/[^a-zà-ÿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !ruis.has(w));

  // Twee kernwoorden geeft betere treffers dan de hele titel.
  return woorden.slice(0, 2).join(" ") || titel;
}

/**
 * Zoekt een foto via Pexels. Zonder `PEXELS_API_KEY` gebeurt er niets — de
 * receptpagina toont dan gewoon geen foto in plaats van een foutmelding.
 * Een gratis sleutel haal je op pexels.com/api.
 */
export async function zoekGerechtFoto(titel: string): Promise<FotoResultaat | null> {
  const sleutel = process.env.PEXELS_API_KEY;
  if (!sleutel) return null;

  const term = `${zoekterm(titel)} food`;

  try {
    const respons = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: sleutel }, signal: AbortSignal.timeout(8000) },
    );

    if (!respons.ok) {
      console.error("Pexels gaf status", respons.status);
      return null;
    }

    const data = (await respons.json()) as {
      photos?: { src?: { large?: string; medium?: string }; photographer?: string }[];
    };

    const foto = data.photos?.[0];
    const url = foto?.src?.large ?? foto?.src?.medium;
    if (!url) return null;

    return { url, bron: foto?.photographer ? `Foto: ${foto.photographer} (Pexels)` : "Pexels" };
  } catch (fout) {
    console.error("Foto zoeken mislukt:", fout);
    return null;
  }
}
