/**
 * Indeling van producten in winkel-/bewaarcategorieën.
 *
 * Bewust een woordenlijst en geen AI-aanroep: dit draait bij elke herberekening
 * van de boodschappenlijst, moet instant zijn, en mag geen quota opsnoepen die
 * je liever aan het weekmenu besteedt. Klopt er iets niet, dan is dat hier één
 * woord bijzetten.
 *
 * De volgorde van CATEGORIEEN is de volgorde waarin je door de winkel loopt.
 */
export const CATEGORIEEN = [
  "groenten & fruit",
  "vlees & vis",
  "zuivel",
  "brood",
  "diepvries",
  "conserven",
  "droge voorraad",
  "kruiden & olie",
  "dranken",
  "overig",
] as const;

export type Categorie = (typeof CATEGORIEEN)[number];

/** Woorden per categorie. Langere, specifiekere woorden eerst laten winnen. */
const WOORDEN: Record<Exclude<Categorie, "overig">, string[]> = {
  "groenten & fruit": [
    "aardappel", "ui", "uien", "sjalot", "knoflook", "look", "wortel", "worteltjes", "prei",
    "sla", "kropsla", "ijsbergsla", "spinazie", "andijvie", "boerenkool", "witloof", "witlof",
    "tomaat", "tomaten", "komkommer", "paprika", "courgette", "aubergine", "broccoli",
    "bloemkool", "spruit", "spruitjes", "sperzieboon", "boontjes", "erwt", "erwtjes",
    "champignon", "paddenstoel", "pompoen", "pastinaak", "knolselder", "selderij", "venkel",
    "rode kool", "witte kool", "spitskool", "savooi", "raap", "biet", "bieten", "radijs",
    "appel", "peer", "banaan", "sinaasappel", "citroen", "limoen", "druif", "druiven",
    "aardbei", "framboos", "bosbes", "mango", "ananas", "avocado", "meloen", "kiwi",
    "peterselie", "bieslook", "koriander", "munt", "basilicum", "rucola", "veldsla",
  ],
  "vlees & vis": [
    "kip", "kipfilet", "kippenbout", "kippendij", "rund", "rundvlees", "biefstuk", "entrecote",
    "varken", "varkenshaas", "karbonade", "spek", "spekjes", "ham", "worst", "rookworst",
    "chipolata", "merguez", "gehakt", "stoofvlees", "stoofpotje", "lam", "kalkoen", "eend",
    "vis", "zalm", "kabeljauw", "tonijn", "koolvis", "pangasius", "victoriabaars", "forel",
    "schol", "garnaal", "garnalen", "scampi", "mossel", "mosselen", "inktvis", "vissticks",
    "salami", "kipfiletblokjes", "vink", "rundervink", "hachee", "hamburger", "burger",
  ],
  zuivel: [
    "melk", "halfvolle melk", "volle melk", "karnemelk", "room", "slagroom", "kookroom",
    "creme fraiche", "crème fraîche", "zure room", "yoghurt", "griekse yoghurt", "kwark",
    "boter", "margarine", "kaas", "geraspte kaas", "parmezaan", "mozzarella", "feta",
    "ricotta", "mascarpone", "brie", "gouda", "cheddar", "hüttenkäse", "ei", "eieren",
    "melkpoeder", "vla", "pudding",
  ],
  brood: [
    "brood", "bruin brood", "wit brood", "zuurdesem", "zuurdesembrood", "pistolet", "baguette",
    "stokbrood", "beschuit", "crackers", "croissant", "wrap", "wraps", "tortilla", "pita",
    "hamburgerbroodje", "broodje", "toast", "ontbijtkoek", "peperkoek",
  ],
  diepvries: [
    "diepvries", "diepvriesgroenten", "frieten", "friet", "frites", "ijs", "roomijs",
    "bladerdeeg", "kruimeldeeg", "vissticks", "loempia", "diepvriespizza", "erwtjes diepvries",
  ],
  conserven: [
    "blik", "blikje", "bokaal", "pot", "passata", "tomatenblokjes", "tomatenpuree",
    "kikkererwt", "kikkererwten", "kidneybonen", "witte bonen", "bruine bonen", "mais", "maïs",
    "olijven", "augurk", "augurken", "zuurkool", "appelmoes", "kokosmelk", "tonijn in blik",
    "ansjovis", "kappertjes", "zongedroogde tomaat",
  ],
  "droge voorraad": [
    "pasta", "spaghetti", "penne", "macaroni", "tagliatelle", "lasagne", "lasagnebladen",
    "rijst", "risottorijst", "basmati", "couscous", "bulgur", "quinoa", "noedels", "mie",
    "meel", "bloem", "suiker", "bruine suiker", "poedersuiker", "gist", "bakpoeder",
    "linzen", "havermout", "muesli", "cornflakes", "noten", "amandel", "walnoot", "rozijn",
    "chocolade", "cacao", "pindakaas", "confituur", "jam", "honing", "paneermeel",
  ],
  "kruiden & olie": [
    "olie", "olijfolie", "zonnebloemolie", "arachideolie", "azijn", "balsamico", "zout",
    "peper", "peperkorrels", "paprikapoeder", "kerrie", "curry", "komijn", "kaneel",
    "nootmuskaat", "laurier", "tijm", "rozemarijn", "oregano", "salie", "kruidenmix",
    "bouillon", "bouillonblokje", "mosterd", "ketchup", "mayonaise", "sojasaus", "sambal",
    "tomatensaus", "pesto", "kruidnagel", "gember", "kurkuma",
  ],
  dranken: [
    "water", "spuitwater", "bruiswater", "sap", "appelsap", "sinaasappelsap", "cola",
    "limonade", "bier", "wijn", "rode wijn", "witte wijn", "koffie", "thee", "melkdrank",
  ],
};

// Eén platte lijst, langste woorden eerst — "rode kool" moet winnen van "kool".
const GESORTEERD: { woord: string; categorie: Categorie }[] = Object.entries(WOORDEN)
  .flatMap(([categorie, woorden]) =>
    woorden.map((woord) => ({ woord, categorie: categorie as Categorie })),
  )
  .sort((a, b) => b.woord.length - a.woord.length);

/**
 * Raadt de categorie van een product. Valt terug op "overig" — beter een
 * restcategorie dan een verkeerde gok.
 */
export function categoriseer(naam: string): Categorie {
  const schoon = naam.toLowerCase().trim();
  for (const { woord, categorie } of GESORTEERD) {
    // Woordgrens links, zodat "ui" niet matcht in "bruin brood". Rechts staan we
    // de gewone Nederlandse meervouds- en verkleinuitgangen toe, anders valt
    // "aardappelen" naast "aardappel" en moet elk woord dubbel in de lijst.
    const patroon = new RegExp(
      `(^|[^a-zà-ÿ])${woord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(en|s|jes|tjes|eren)?([^a-zà-ÿ]|$)`,
      "i",
    );
    if (patroon.test(schoon)) return categorie;
  }
  return "overig";
}

/** Sorteervolgorde voor de weergave: winkelroute, "overig" achteraan. */
export function categorieVolgorde(categorie: string): number {
  const i = (CATEGORIEEN as readonly string[]).indexOf(categorie);
  return i === -1 ? CATEGORIEEN.length : i;
}
