export type Rol = "owner" | "member";
export type Maaltijdtype = "ontbijt" | "lunch" | "avond";
export type WeekmenuStatus = "concept" | "bevestigd";
export type EntryBron = "ai_generated" | "database" | "handmatig";

export interface Ingredient {
  naam: string;
  hoeveelheid: number;
  eenheid: string;
}

export interface Gebruiker {
  id: string;
  email: string;
  naam: string | null;
  avatar_url: string | null;
}

export interface Gezin {
  id: string;
  naam: string;
  invite_code: string;
}

export interface Gezinslid {
  user_id: string;
  role: Rol;
  users: Pick<Gebruiker, "id" | "email" | "naam" | "avatar_url"> | null;
}

export type ActiviteitSoort =
  | "menu_bijgewerkt"
  | "gerecht_verwijderd"
  | "menu_bevestigd"
  | "voorkeuren_gewijzigd"
  | "lid_toegevoegd"
  | "lid_verwijderd";

export interface Activiteit {
  id: string;
  soort: ActiviteitSoort;
  omschrijving: string;
  /** null = Basiel */
  actor_id: string | null;
  created_at: string;
}

export interface Dieetwens {
  naam: string;
  tekst: string;
}

export interface GezinsVoorkeuren {
  family_id: string;
  /** 0 = zondag … 6 = zaterdag */
  week_start_day: number;
  meals_to_plan: Maaltijdtype[];
  kookstijl_notities: string;
  dieetwensen: Dieetwens[];
}

export interface VoorraadItem {
  id: string;
  family_id: string;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  categorie: string;
  houdbaar_tot: string | null;
  updated_at: string;
}

export interface Weekmenu {
  id: string;
  family_id: string;
  week_start_date: string;
  status: WeekmenuStatus;
}

export interface WeekmenuEntry {
  id: string;
  weekmenu_id: string;
  datum: string;
  maaltijdtype: Maaltijdtype;
  titel: string;
  beschrijving: string;
  ingredienten: Ingredient[];
  porties: number;
  bereidingstijd_minuten: number | null;
  /** Genummerde stappen; pas gevuld zodra iemand het gerecht openklikt. */
  bereidingswijze: string[];
  recept_bijgewerkt_op: string | null;
  bron: EntryBron;
}

export interface ChatBericht {
  id: string;
  role: "user" | "assistant";
  content: string;
  user_id: string | null;
  created_at: string;
}

export interface BoodschapItem {
  id: string;
  naam: string;
  hoeveelheid: number | null;
  eenheid: string | null;
  afgevinkt: boolean;
  bron: "auto_gegenereerd" | "handmatig";
}

export const CATEGORIEEN = [
  "groenten & fruit",
  "vlees & vis",
  "zuivel",
  "droge voorraad",
  "diepvries",
  "kruiden & olie",
  "overig",
] as const;

export const MAALTIJDTYPES: { waarde: Maaltijdtype; label: string }[] = [
  { waarde: "ontbijt", label: "Ontbijt" },
  { waarde: "lunch", label: "Lunch" },
  { waarde: "avond", label: "Avondeten" },
];
