# Simmer online zetten op `simmer.lennertboone.com`

Je domein staat op GoDaddy shared hosting: Apache met PHP. Daar kan Next.js niet draaien — dat
heeft een Node-omgeving nodig. De app draait dus op Vercel, en je domein wijst ernaar met één
DNS-record. Je bestaande PHP-site op `lennertboone.com` blijft onaangeroerd.

Reken op een half uur, inclusief wachten op DNS.

---

## 1. Code naar GitHub

Er staat nog niets in git. Vanuit de projectmap:

```bash
git add .
git commit -m "Simmer: weekmenu-planner voor het gezin"
```

Maak daarna een **lege, private** repository aan op GitHub (zonder README of .gitignore) en koppel:

```bash
git remote add origin https://github.com/<jouw-gebruikersnaam>/simmer.git
git branch -M main
git push -u origin main
```

`.env.local` gaat niet mee — die staat in `.gitignore`. Controleer dat even met `git status`:
je sleutels horen nergens in de repo te staan.

---

## 2. Vercel

1. Ga naar [vercel.com](https://vercel.com) en meld je aan met je GitHub-account.
2. **Add New → Project** en kies de repo. Vercel herkent Next.js zelf; laat alle build-instellingen
   staan.
3. Voeg vóór het deployen de omgevingsvariabelen toe (**Environment Variables**), voor alle drie de
   omgevingen:

   | Naam | Waarde |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | dezelfde als lokaal |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dezelfde als lokaal |
   | `GEMINI_API_KEY` | dezelfde als lokaal |
   | `GEMINI_MODEL` | `gemini-3.6-flash` |
   | `NEXT_PUBLIC_SITE_URL` | `https://simmer.lennertboone.com` |

   Die laatste is belangrijk: daarmee bouwt de app de terugkeer-URL na het inloggen. Staat er nog
   `http://localhost:3000`, dan stuurt Google je na het aanmelden naar je eigen laptop.

4. **Deploy**. Je krijgt een adres als `simmer-xyz.vercel.app` — dat werkt al, maar het inloggen nog
   niet. Dat komt bij stap 4.

---

## 3. Het subdomein koppelen

**In Vercel:** project → **Settings → Domains** → voeg `simmer.lennertboone.com` toe. Vercel toont
welk record je moet zetten.

**Bij GoDaddy:** ga naar je domeinbeheer → **DNS** → **Add record**:

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `simmer` | `cname.vercel-dns.com` | 1 uur |

Neem de waarde over die Vercel je toont — die kan afwijken. Raak je bestaande A-record voor
`@` (dat naar `92.205.11.87` wijst) niet aan; dat is je PHP-site.

Binnen een kwartier staat het meestal, soms duurt het langer. Vercel zet zelf het HTTPS-certificaat
klaar zodra het record zichtbaar is.

---

## 4. Supabase bijwerken

Zonder deze stap kun je online niet inloggen — de app draait dan wel, maar elke inlogpoging komt
terug op een foutpagina.

**Authentication → URL Configuration:**

- **Site URL**: `https://simmer.lennertboone.com`
- **Redirect URLs**: voeg toe (laat de localhost-regels staan zodat je lokaal kunt blijven werken):
  ```
  https://simmer.lennertboone.com/auth/callback
  http://localhost:3000/auth/callback
  ```

**Google OAuth hoeft niet gewijzigd te worden.** De redirect-URI daar wijst naar Supabase
(`https://ttnmjqgmrmcaghnqzneu.supabase.co/auth/v1/callback`), niet naar je eigen domein. Wat je
wél moet nakijken: staat je OAuth consent screen nog op **Testing**, dan kunnen alleen de adressen
onder *Test users* inloggen. Zet hem op **In production** als de rest van het gezin erbij moet —
voor gewone profiel- en e-mailtoegang is geen Google-verificatie nodig.

---

## 5. Migraties

Controleer dat alle vier gedraaid zijn in de SQL Editor:

| Migratie | Wat er stukgaat zonder |
| --- | --- |
| `schema.sql` | alles |
| `001_google_login_naam.sql` | Google-gebruikers heten naar hun e-mailprefix |
| `002_recept_stappen.sql` | receptpagina kan geen stappen bewaren |
| `003_meldingen_en_profiel.sql` | belletje blijft leeg, geen profielfoto's |
| `004_profielfotos.sql` | foto uploaden geeft een foutmelding |

Je gebruikt hetzelfde Supabase-project voor lokaal en online. Dat is prima om te beginnen, maar
betekent wel dat je met echte gezinsdata zit te testen. Wil je dat scheiden, dan is een tweede
Supabase-project de nette weg — dan draai je daar alle migraties opnieuw en zet je die sleutels in
Vercel.

---

## Waar je op moet letten

**De gratis Gemini-laag is gedeeld.** Alle gezinsleden trekken uit dezelfde daglimiet. Voor één
weekmenu plus wat bijsturen is dat ruim voldoende, maar als het op is krijg je tot de volgende dag
de melding dat de limiet bereikt is.

**Een volledige week plannen duurt 30 à 45 seconden.** Vercel kapt op het gratis Hobby-plan af na
60 seconden. Dat past, maar niet royaal. Loop je er in de praktijk tegenaan, dan zijn de opties:
overstappen op Pro (dan mag `maxDuration` naar 300 in `src/app/api/chat/route.ts`), of Basiel per
keer een halve week laten plannen.

**Alles staat achter een login**, dus er komt niemand ongevraagd binnen. Wel kan iedereen die de
uitnodigingscode van zes tekens heeft bij jullie gezin. Deel die dus niet breder dan nodig.

**Basiel kost geld noch niets extra's per bezoeker**, maar de Vercel-functie draait bij elk
chatbericht. Op Hobby zit je ruim binnen de limieten voor een gezinsapp.

---

## Later teruggaan naar `lennertboone.com/simmer`

Wil je het toch onder een subpad, dan kan dat door je nameservers naar Cloudflare te verhuizen
(gratis) en daar een rewrite-regel te zetten. Aan de app-kant vraagt dat `basePath: "/simmer"` in
`next.config.ts`, plus aanpassingen op vier plekken die nu absolute paden gebruiken: de twee
`fetch("/api/…")`-aanroepen in `Chat.tsx` en `ReceptStappen.tsx`, en de `${origin}`-redirects in
`src/app/auth/callback/route.ts`. Zeg het maar, dan zet ik dat om.
