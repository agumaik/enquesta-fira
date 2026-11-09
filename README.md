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
- Destí de producció: `enquesta-fira.agumaik.tech` (compte Cloudflare **agumaik**)

## Requisits

- Node.js 20+
- Compte Cloudflare (per desplegar) amb Wrangler autenticat

## Desenvolupament local

```bash
npm install
cp .dev.vars.example .dev.vars   # claus de prova de Turnstile, codi i contrasenya «prova»
npm run build
npm run db:migrate:local
npm run dev
```

Obre `http://127.0.0.1:3847/?c=prova`.

El Worker serveix els assets estàtics i l’API:

| Ruta | Descripció |
|------|------------|
| `GET /api/status?c=CODI` | `{ open, codeValid, turnstileSiteKey }` |
| `POST /api/submit` | Desa una resposta a D1 (requereix `accessCode` i `turnstileToken`) |
| `GET /admin/export.csv` | CSV de totes les respostes (autenticació bàsica, contrasenya `ADMIN_PASSWORD`, qualsevol usuari) |

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
   npx wrangler secret put ADMIN_PASSWORD
   ```

4. Apliqueu migracions remotes i desplegueu:

   ```bash
   npm run build
   npm run db:migrate:remote
   npm run deploy
   ```

5. El domini `enquesta-fira.agumaik.tech` es configura sol amb `routes` a `wrangler.toml`.

## Dades

Taula D1 `responses`:

- `id` (UUID)
- `email` (únic, sense distinció de majúscules)
- `collectiu`
- `payload` (JSON amb totes les respostes)
- `created_at`

Exporteu-les obrint `https://enquesta-fira.agumaik.tech/admin/export.csv` (CSV amb `;`, s’obre directament amb Excel o LibreOffice). També podeu consultar amb:

```bash
npx wrangler d1 execute enquesta-fira-db --remote --command "SELECT id, email, collectiu, created_at FROM responses ORDER BY created_at DESC LIMIT 20"
```

## Stack

- Cloudflare Workers + Static Assets
- D1 (SQLite)
- Frontend Vite (HTML/CSS/TypeScript)
- Wrangler 4
