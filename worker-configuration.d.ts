// Generated locally for typecheck without requiring `wrangler types`.
// Re-run `npm run cf-typegen` after changing wrangler.toml bindings.
interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SURVEY_OPEN: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET: string;
  ACCESS_CODE: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ACCESS_DEV_BYPASS_EMAIL?: string;
}
