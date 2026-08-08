# Simmer — weekmenu-planner voor het gezin

Een webapp waarmee een gezin samen een weekmenu opstelt via een AI-chatbot, rekening houdend met
wat er nog in huis is. De chat is geen apart kanaal — het *is* de editor: je beschrijft de week in
gewone taal en het weekoverzicht ernaast past zich meteen aan.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (auth, Postgres, realtime)
· Google Gemini.

---

## Opzetten

### 1. Supabase

1. Maak een leeg project op [supabase.com](https://supabase.com).
2. Plak de volledige inhoud van [`supabase/schema.sql`](supabase/schema.sql) in de SQL Editor en
   voer die uit. Dat zet in één keer de tabellen, de RLS-policies, de RPC's voor gezin
   aanmaken/joinen en de realtime-publicatie klaar.
   *Bestaand project? Draai dan ook de migraties in
   [`supabase/migrations/`](supabase/migrations) die je nog niet had.*
3. Onder **Authentication → Providers** moet *Email* aan staan. Zet **Confirm email** uit als je
   wilt dat een nieuw account meteen binnen is; laat het aan als je wél een bevestigingsmail wilt.
   Zet bij **URL Configuration** de Site URL op `http://localhost:3000` (en later je productie-URL),
   en voeg `http://localhost:3000/auth/callback` toe aan de Redirect URLs.

### 1b. Inloggen met Google

1. Ga naar de [Google Cloud Console](https://console.cloud.google.com) → maak een project (of kies
   een bestaand).
2. **APIs & Services → OAuth consent screen**: kies *External*, vul app-naam en je e-mailadres in.
   Zolang de app in *Testing* staat moet je jezelf toevoegen bij **Test users**, anders word je
   geweigerd.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type *Web application*.
   Zet bij **Authorized redirect URIs** exact dit:
   ```
   https://<jouw-project-ref>.supabase.co/auth/v1/callback
   ```
   Dat is de Supabase-callback, niet die van je eigen app. Je vindt de URL kant-en-klaar in
   Supabase onder Authentication → Providers → Google.
4. Kopieer de **Client ID** en **Client secret** naar Supabase onder **Authentication → Providers →
   Google**, en zet de provider aan.

### 2. Omgevingsvariabelen

```bash
cp .env.example .env.local
```

Vul in:

| Variabele | Waar te vinden |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — gratis |
| `GEMINI_MODEL` | optioneel; standaard `gemini-3.6-flash` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` lokaal |

### 3. Draaien

```bash
npm install
npm run dev
```

Ga naar `http://localhost:3000`, maak een account aan met e-mail en wachtwoord of meld je aan met
Google, maak een gezin aan en loop de onboarding door.

### 4. Online zetten

Zie [`DEPLOY.md`](DEPLOY.md) — Vercel plus één DNS-record bij GoDaddy.

---

## Hoe het in elkaar zit

### De flow

1. **Inloggen** — Supabase Auth met e-mail + wachtwoord (aanmelden én registreren op één scherm),
   of met Google. Wachtwoord vergeten loopt via `/wachtwoord-vergeten` → mail → `/auth/callback`
   → `/wachtwoord-herstellen`. Een trigger op `auth.users` maakt automatisch het profiel aan en
   pakt daarbij de naam uit het registratieformulier of die Google meestuurt.
2. **Gezin** — je maakt er een aan (je wordt `owner`) of sluit aan met een uitnodigingscode van zes
   tekens. Beide lopen via een `security definer` RPC, zodat `family_members` niet vrij
   beschrijfbaar hoeft te zijn.
3. **Onboarding** — welke maaltijden gepland worden (standaard alleen avondeten), op welke dag de
   week begint, hoe jullie graag koken, en allergieën/dieetwensen per lid. Allemaal instelbaar, niet
   hardcoded.
4. **Voorraad** — handmatige lijst per categorie, met `+`/`−` zodat bijwerken na het koken twee
   tikjes kost. Realtime gedeeld met de rest van het gezin.
4a. **Je account** — via je profielfoto kom je op `/instellingen`: naam wijzigen en een
   profielfoto uploaden naar de Supabase-bucket `avatars`. Iedereen mag die foto's lezen, maar
   schrijven kan alleen in je eigen map (`<user-id>/…`), afgedwongen met een storage-policy. Bij
   een nieuwe upload wordt de oude foto opgeruimd.
4b. **Recept** — klik een gerecht aan en je krijgt `/gerecht/[id]` met ingrediënten en een
   bereidingsplan in genummerde stappen (afvinkbaar tijdens het koken). Die stappen worden pas
   gegenereerd zodra je het gerecht voor het eerst opent, en daarna bewaard — zeven recepten
   meegenereren bij elke menuvraag zou traag en verspillend zijn.
5. **Chat → weekmenu** — je beschrijft de week; Gemini krijgt de voorkeuren, de voorraad en het
   huidige menu als context mee en roept het gereedschap `werk_weekmenu_bij` aan met een
   gestructureerd voorstel. Alleen de meegestuurde dagen worden aangepast, de rest blijft staan.
6. **Boodschappenlijst** — automatisch afgeleid van de menu-ingrediënten min de voorraad, en
   opnieuw berekend zodra het menu wijzigt. Vinkjes blijven bewaard, handmatige regels blijven
   staan.

### Belangrijke bestanden

| Pad | Wat |
| --- | --- |
| `supabase/schema.sql` | Volledig datamodel, RLS, RPC's, realtime |
| `src/app/api/chat/route.ts` | De chatroute: context opbouwen, Gemini aanroepen, menu wegschrijven |
| `src/lib/shopping.ts` | Boodschappenlijst afleiden uit menu min voorraad |
| `src/lib/recipes/index.ts` | Abstractielaag over receptenbronnen |
| `src/lib/family.ts` | Gezinscontext + weekmenu van de huidige week ophalen/aanmaken |
| `src/lib/week.ts` | Weekberekening rond de instelbare startdag, plus `?week=`-navigatie |
| `src/components/Navigatie.tsx` | Onderbalk op mobiel, inklapbare zijbalk vanaf tablet |
| `src/components/ChatBubble.tsx` | Basiel als zwevend bolletje met chatpaneel |
| `src/app/api/recept/route.ts` | Bereidingsstappen genereren voor één gerecht |

### De AI-aanroep

Model `gemini-3.6-flash` met function calling, in twee beurten.

**Beurt 1** krijgt de voorkeuren, voorraad en het huidige menu mee en roept `werk_weekmenu_bij`
aan. **Beurt 2** vraagt de uitleg op die in de chat komt te staan. Die tweede beurt is nodig omdat
Gemini per beurt óf een functie-aanroep óf tekst geeft, nooit allebei — na een menuwijziging zou
de chat anders leeg blijven.

Belangrijk detail: die tweede beurt gaat **zonder tools** de deur uit, met alleen een samenvatting
van wat er is toegepast. De voor de hand liggende aanpak — de functieuitkomst terugspelen met
`functionCallingConfig: NONE` — werkt niet: het model roept de functie dan gewoon nóg een keer aan
en geeft nog steeds geen tekst. Zonder tools kán dat niet en krijg je gegarandeerd woorden terug.
Mislukt beurt 2, dan blijft het menu gewoon staan; alleen de uitleg valt dan terug op een vaste
zin.

Het gereedschap `werk_weekmenu_bij`
schrijft het menu weg. De
gereedschapsinvoer wordt server-side gevalideerd: datums moeten binnen de huidige week vallen en
het maaltijdtype moet er een zijn dat het gezin wil plannen — het model kan dus niet buiten de
afgesproken lijnen kleuren.

Allergieën en kookstijl gaan als *harde beperking* de systeemprompt in, niet als suggestie.

### Receptenbronnen

AI-generatie is het primaire pad. `getRecipeSuggestions()` in `src/lib/recipes/index.ts` is de
abstractielaag: er zit een provider-interface in en een lege placeholder voor een externe API
(bv. Spoonacular). Zolang `RECIPE_API_KEY` niet gezet is meldt die zich als niet-beschikbaar en
verandert er niets aan de flow. Een bron toevoegen = één provider implementeren, geen refactor.

---

## Nog niet gebouwd (bewust)

- **Geschiedenis van vorige weken.** De app werkt alleen met het weekmenu van de huidige week; dat
  wordt aangemaakt zodra iemand de app opent. Het datamodel (`weekmenus.week_start_date`) laat
  meerdere weken toe, dus dit is een uitbreiding, geen verbouwing.
- **Barcode-scan en bonnetjes-OCR** voor de voorraad — buiten de MVP.
- **Externe recepten-API** — abstractielaag ligt klaar, bron nog niet gekozen.

---

## Ontwerp

Concept: *het aanrecht bij daglicht*. Achtergrond warm wit `#F6F5F1`, kaarten zuiver wit met een
zachte schaduw, diep kruidengroen `#3F6B4F` voor navigatie en CTA's, warm saffraangeel `#D9A441`
uitsluitend als highlight voor "vanavond". Titels in Zilla Slab (kookboekgevoel), UI in Inter,
hoeveelheden in IBM Plex Mono met tabular cijfers zodat de boodschappenlijst prettig scant.

Het signature-element zit in `.kaart-vanavond` (`src/app/globals.css`): de vandaag-kaart is groot,
zuiver wit en heeft een warme gloed, alsof er een lamp op schijnt. De rest van de week staat er
klein onder als één regel per dag — datum, gerecht, bereidingstijd. Motion blijft beperkt tot die
kaart en het verschijnen van AI-antwoorden.

**Navigatie:** op mobiel een bovenbalk (profielfoto links, meldingen rechts) plus een vaste
onderbalk met iconen. Vanaf tablet een zijbalk die je kunt inklappen tot alleen iconen (voorkeur
blijft in `localStorage`), met profiel en meldingen onderin. Instellingen staat bewust niet in de
navigatie — dat bereik je via je profielfoto.

**App-icoon:** `src/app/icon.svg` (favicon), `src/app/apple-icon.tsx` (180×180 PNG via
`next/og`) en `src/app/manifest.ts`. Een witte pot met saffraan stoom op kruidengroen. Let op: de
metadata-routes staan in de matcher-uitzondering van `src/proxy.ts`, anders stuurt de auth-check
ze naar de loginpagina.

**Meldingen** komen uit de tabel `activiteit`: een logboek per gezin van menuwijzigingen door
Basiel, verwijderde gerechten, bevestigde menu's en leden die komen of gaan. Ongelezen wordt
bepaald door `family_members.meldingen_gelezen_op` te vergelijken met `created_at` — geen aparte
koppeltabel nodig. Het belletje telt live mee via realtime. Voorraadwijzigingen worden er bewust
níét in gelogd: met "+1 melk" per tik loopt de lijst binnen een dag vol.

**Basiel** is de kookhulp: een zwevend bolletje rechtsonder dat een chatpaneel opent. Op mobiel een
bottom sheet, op desktop een zwevend venster dat de pagina eronder niet blokkeert. Zijn toon staat
in de systeemprompt in `src/app/api/chat/route.ts` — nuchter en warm, geen uitroeptekens. Een
andere naam of toon is één plek aanpassen.
