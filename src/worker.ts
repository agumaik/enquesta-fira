import { normalizeEmail, validateSubmission } from "./survey";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SURVEY_OPEN: string;
}

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

async function handleStatus(env: Env): Promise<Response> {
  return json({
    open: isSurveyOpen(env),
    title: "Enquesta valoració IV Edició Fira del Llibre en Català a Terrassa",
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON invàlid." }, 400);
  }

  const parsed = validateSubmission(body);
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  const { data } = parsed;
  const email = normalizeEmail(data.email);

  const existing = await env.DB.prepare(
    "SELECT id FROM responses WHERE email = ? LIMIT 1",
  )
    .bind(email)
    .first<{ id: string }>();

  if (existing) {
    return json(
      {
        error:
          "Ja hi ha una resposta registrada amb aquest correu. Només es permet una resposta per adreça.",
      },
      409,
    );
  }

  const id = crypto.randomUUID();
  const payload = JSON.stringify(data);

  try {
    await env.DB.prepare(
      "INSERT INTO responses (id, email, collectiu, payload) VALUES (?, ?, ?, ?)",
    )
      .bind(id, email, data.collectiu, payload)
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE|unique|constraint/i.test(message)) {
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
    JSON.stringify({
      level: "info",
      msg: "survey_submitted",
      id,
      collectiu: data.collectiu,
    }),
  );

  return json({ ok: true, id });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/status" && request.method === "GET") {
      return handleStatus(env);
    }

    if (url.pathname === "/api/submit" && request.method === "POST") {
      return handleSubmit(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "No trobat." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
