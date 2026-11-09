import {
  MATRICES,
  MAX_BODY_BYTES,
  TEXT_FIELDS,
  normalizeEmail,
  validateSubmission,
} from "./survey";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SURVEY_OPEN: string;
  TURNSTILE_SITE_KEY: string;
  /** Secrets */
  TURNSTILE_SECRET: string;
  ACCESS_CODE: string;
  ADMIN_PASSWORD: string;
}

/** Responses are deleted this long after submission (privacy notice: 2 anys). */
const RETENTION = "-2 years";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isSurveyOpen(env: Env): boolean {
  const v = (env.SURVEY_OPEN ?? "true").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes" || v === "open";
}

const enc = new TextEncoder();

/** Constant-time string comparison; false when either side is empty. */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  // Workers runtime extension; the DOM lib's SubtleCrypto type shadows it here.
  const subtle = crypto.subtle as unknown as {
    timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  };
  return subtle.timingSafeEqual(x, y);
}

function accessOk(env: Env, code: unknown): boolean {
  return typeof code === "string" && safeEqual(code.trim(), env.ACCESS_CODE ?? "");
}

async function verifyTurnstile(
  env: Env,
  token: unknown,
  ip: string | null,
): Promise<boolean> {
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  if (!res.ok) return false;
  const out = (await res.json()) as { success?: boolean };
  return out.success === true;
}

function handleStatus(url: URL, env: Env): Response {
  return json({
    open: isSurveyOpen(env),
    codeValid: accessOk(env, url.searchParams.get("c")),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
  });
}

async function handleSubmit(request: Request, env: Env): Promise<Response> {
  if (!isSurveyOpen(env)) {
    return json(
      {
        error:
          "L’enquesta està tancada. Gràcies per l’interès; ja no s’accepten més respostes.",
      },
      403,
    );
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) {
    return json({ error: "Resposta massa llarga." }, 413);
  }
  const text = await request.text();
  if (enc.encode(text).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Resposta massa llarga." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "JSON invàlid." }, 400);
  }
  const raw = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  if (!accessOk(env, raw.accessCode)) {
    return json(
      {
        error:
          "L’enllaç no és vàlid. Feu servir l’enllaç que us ha enviat l’organització.",
      },
      401,
    );
  }

  const parsed = validateSubmission(body);
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  const human = await verifyTurnstile(
    env,
    raw.turnstileToken,
    request.headers.get("cf-connecting-ip"),
  );
  if (!human) {
    return json(
      { error: "No s’ha pogut verificar l’enviament. Torneu-ho a provar." },
      400,
    );
  }

  const { data } = parsed;
  const email = normalizeEmail(data.email);
  const id = crypto.randomUUID();

  try {
    await env.DB.prepare(
      "INSERT INTO responses (id, email, collectiu, payload) VALUES (?, ?, ?, ?)",
    )
      .bind(id, email, data.collectiu, JSON.stringify(data))
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE/i.test(message)) {
      return json(
        {
          error:
            "Ja hi ha una resposta registrada amb aquest correu. Només es permet una resposta per adreça.",
        },
        409,
      );
    }
    console.error(JSON.stringify({ level: "error", msg: "d1_insert_failed", message }));
    return json({ error: "No s’ha pogut desar la resposta. Torneu-ho a provar." }, 500);
  }

  console.log(
    JSON.stringify({ level: "info", msg: "survey_submitted", id, collectiu: data.collectiu }),
  );
  return json({ ok: true, id });
}

function adminAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const password = decoded.slice(decoded.indexOf(":") + 1);
  return safeEqual(password, env.ADMIN_PASSWORD ?? "");
}

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function handleExport(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT id, created_at, payload FROM responses ORDER BY created_at",
  ).all<{ id: string; created_at: string; payload: string }>();

  const columns: { header: string; get: (p: Record<string, any>) => unknown }[] = [
    { header: "Col·lectiu", get: (p) => p.collectiu },
    { header: "Correu", get: (p) => p.email },
    { header: "Participació", get: (p) => p.participacio },
  ];
  for (const m of MATRICES) {
    for (const row of m.rows) {
      columns.push({
        header: `${m.group} · ${row.label}`,
        get: (p) => p[m.group]?.[row.key],
      });
    }
  }
  for (const key of TEXT_FIELDS) {
    columns.push({ header: key, get: (p) => p[key] });
  }

  const lines = [["ID", "Data (UTC)", ...columns.map((c) => c.header)].map(csvCell).join(";")];
  for (const r of results) {
    const p = JSON.parse(r.payload) as Record<string, any>;
    lines.push([r.id, r.created_at, ...columns.map((c) => c.get(p))].map(csvCell).join(";"));
  }

  // BOM + ';' so Excel/LibreOffice in Catalan/Spanish locale open it directly.
  return new Response("\uFEFF" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="respostes-enquesta-fira.csv"',
      "cache-control": "no-store",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/status" && request.method === "GET") {
      return handleStatus(url, env);
    }
    if (url.pathname === "/api/submit" && request.method === "POST") {
      return handleSubmit(request, env);
    }
    if (url.pathname.startsWith("/api/")) {
      return json({ error: "No trobat." }, 404);
    }

    if (url.pathname === "/admin/export.csv") {
      if (!adminAuthorized(request, env)) {
        return new Response("Cal autenticació.", {
          status: 401,
          headers: {
            "www-authenticate": 'Basic realm="Enquesta Fira", charset="UTF-8"',
            "cache-control": "no-store",
          },
        });
      }
      return handleExport(env);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const res = await env.DB.prepare(
      "DELETE FROM responses WHERE created_at < datetime('now', ?)",
    )
      .bind(RETENTION)
      .run();
    console.log(
      JSON.stringify({ level: "info", msg: "retention_purge", deleted: res.meta.changes }),
    );
  },
} satisfies ExportedHandler<Env>;
