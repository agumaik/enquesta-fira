# Enquesta Fira del Llibre

Enquesta pública de valoració de la **IV Edició de la Fira del Llibre en Català a Terrassa**.

- UI en català amb branding de [firallibrecatalaterrassa.cat](https://firallibrecatalaterrassa.cat/)
- Una resposta per correu (D1, índex únic)
- Obligatoris: col·lectiu, correu, consentiment de privacitat
- Tancament manual amb la variable `SURVEY_OPEN`
- Destí de producció: `enquesta-fira.agumaik.tech` (compte Cloudflare **agumaik**)

## Requisits

- Node.js 20+
- Compte Cloudflare (per desplegar) amb Wrangler autenticat

## Desenvolupament local

```bash
npm install
npm run build
npm run db:migrate:local
npm run dev
```

Obre `http://127.0.0.1:3847`.

El Worker serveix els assets estàtics i l’API:

| Ruta | Descripció |
|------|------------|
| `GET /api/status` | `{ open: boolean }` |
| `POST /api/submit` | Desa una resposta a D1 |

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

3. Apliqueu migracions remotes i desplegueu:

   ```bash
   npm run build
   npm run db:migrate:remote
   npm run deploy
   ```

4. Domini personalitzat `enquesta-fira.agumaik.tech`:

   - Descomenteu el bloc `routes` a `wrangler.toml`, **o**
   - Dashboard → Worker `enquesta-fira` → Domains → afegiu `enquesta-fira.agumaik.tech`
   - El DNS del zone `agumaik.tech` ha d’estar al mateix compte

## Dades

Taula D1 `responses`:

- `id` (UUID)
- `email` (únic, sense distinció de majúscules)
- `collectiu`
- `payload` (JSON amb totes les respostes)
- `created_at`

No hi ha panell d’admin ni export CSV encara. Podeu consultar amb:

```bash
npx wrangler d1 execute enquesta-fira-db --remote --command "SELECT id, email, collectiu, created_at FROM responses ORDER BY created_at DESC LIMIT 20"
```

## Stack

- Cloudflare Workers + Static Assets
- D1 (SQLite)
- Frontend Vite (HTML/CSS/TypeScript)
- Wrangler 4
