# Enquesta Fira del Llibre

Enquesta pública de valoració de la **IV Edició de la Fira del Llibre en Català a Terrassa**.

- UI en català amb branding de [firallibrecatalaterrassa.cat](https://firallibrecatalaterrassa.cat/)
- Una resposta per correu (D1, índex únic)
- Obligatoris: col·lectiu, correu, consentiment de privacitat
- Accés amb codi comú a l’enllaç (`https://enquesta-fira.agumaik.tech/?c=CODI`, secret `ACCESS_CODE`)
- Antispam amb Cloudflare Turnstile (invisible); validació estricta de totes les respostes al Worker
- Esborrany automàtic al navegador (`localStorage`); la secció 8 només apareix si s’organitzen activitats
- Fonts i imatges servides des del mateix domini; capçaleres de seguretat a `public/_headers`
- Conservació: les respostes de més de 2 anys s’esborren cada dia (Cron Trigger)
- Tancament manual amb la variable `SURVEY_OPEN`
- Panell d’administració a `/admin/` (resultats agregats, respostes completes, informe imprimible, CSV) protegit amb Cloudflare Zero Trust
- Destí de producció: `enquesta-fira.agumaik.tech` (compte Cloudflare **agumaik**)

## Requisits

- Node.js 20+
- Compte Cloudflare (per desplegar) amb Wrangler autenticat

## Desenvolupament local

```bash
npm install
cp .dev.vars.example .dev.vars   # claus de prova de Turnstile, codi «prova», accés local a /admin
npm run build
npm run db:migrate:local
npm run dev
```

Obre `http://127.0.0.1:3847/?c=prova` (enquesta) o `http://127.0.0.1:3847/admin/` (panell).

El Worker serveix els assets estàtics i l’API:

| Ruta | Descripció |
|------|------------|
| `GET /api/status?c=CODI` | `{ open, codeValid, turnstileSiteKey }` |
| `POST /api/submit` | Desa una resposta a D1 (requereix `accessCode` i `turnstileToken`) |
| `GET /admin/` | Panell de resultats (Zero Trust) |
| `GET /admin/informe` | Informe per imprimir o desar en PDF; accepta els mateixos filtres (`?collectiu=…&participacio=…`) |
| `GET /admin/api/responses` | JSON amb totes les respostes (Zero Trust) |
| `GET /admin/export.csv` | CSV de totes les respostes (Zero Trust) |

### Tancar l’enquesta

Localment, creeu `.dev.vars`:

```bash
SURVEY_OPEN=false
```

En producció:

```bash
wrangler secret put SURVEY_OPEN
# o actualitzeu [vars] a wrangler.toml i torneu a desplegar
```

Valors que mantenen l’enquesta **oberta**: `true`, `1`, `yes`, `open`. Qualsevol altre valor la tanca.

## Desplegament (Cloudflare Workers + D1 + Assets)

1. Autentiqueu Wrangler al compte **agumaik**:

   ```bash
   npx wrangler login
   ```

2. Creeu la base D1 (una sola vegada):

   ```bash
   npx wrangler d1 create enquesta-fira-db
   ```

   Copieu l’`database_id` resultant a `wrangler.toml` (substituiu el placeholder).

3. Configureu els secrets (el widget de Turnstile és al compte agumaik, nom `enquesta-fira`):

   ```bash
   npx wrangler secret put TURNSTILE_SECRET
   npx wrangler secret put ACCESS_CODE
   ```

4. Apliqueu migracions remotes i desplegueu:

   ```bash
   npm run build
   npm run db:migrate:remote
   npm run deploy
   ```

5. El domini `enquesta-fira.agumaik.tech` es configura sol amb `routes` a `wrangler.toml`.

## Panell d’administració

`https://enquesta-fira.agumaik.tech/admin/`

- **Valoracions 1–5**: mitjana per pregunta i per bloc, distribució de puntuacions
- **Opcions** (Suficient/Insuficient, Sí/No, Molt bé/Correcte/S’ha de millorar): percentatges i recomptes
- **Text lliure**: recompte i mostra; «Veure totes les respostes» obre un panell lateral amb totes les respostes i cercador
- Clic en una pregunta: desglossament per col·lectiu i respostes individuals; des de qualsevol resposta s’obre la resposta completa
- Filtres per col·lectiu i participació (es mantenen a l’URL)
- **Informe per imprimir** (`/admin/informe`): totes les dades agregades i tots els textos, amb format A4, per imprimir o desar en PDF; no inclou els correus

### Accés (Cloudflare Zero Trust)

- Organització Zero Trust: `firallibrecatalaterrassa.cloudflareaccess.com` (compte agumaik), login amb codi d’un sol ús per correu
- Aplicació Access «Enquesta Fira · Administració» sobre `enquesta-fira.agumaik.tech/admin` i `/admin/*`
- Política «Administradors»: correus permesos. Per afegir-ne: Zero Trust → Access → Applications → Enquesta Fira · Administració → Policies → Administradors → Include → Emails
- El Worker valida també el JWT d’Access (`Cf-Access-Jwt-Assertion`, variables `ACCESS_TEAM_DOMAIN` i `ACCESS_AUD` a `wrangler.toml`), de manera que l’URL `workers.dev` no dona accés a `/admin`
- En local, `ACCESS_DEV_BYPASS_EMAIL` (només a `.dev.vars`) desactiva la comprovació; no el definiu mai a producció

## Dades

Taula D1 `responses`:

- `id` (UUID)
- `email` (únic, sense distinció de majúscules)
- `collectiu`
- `payload` (JSON amb totes les respostes)
- `created_at`

Analitzeu-les al panell `https://enquesta-fira.agumaik.tech/admin/` o exporteu-les amb el botó «Descarrega CSV» (`/admin/export.csv`, CSV amb `;`, s’obre directament amb Excel o LibreOffice). També podeu consultar amb:

```bash
npx wrangler d1 execute enquesta-fira-db --remote --command "SELECT id, email, collectiu, created_at FROM responses ORDER BY created_at DESC LIMIT 20"
```

## Stack

- Cloudflare Workers + Static Assets
- D1 (SQLite)
- Frontend Vite (HTML/CSS/TypeScript)
- Wrangler 4
