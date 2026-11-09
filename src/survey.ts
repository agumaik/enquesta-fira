/** Shared survey definitions (client + Worker) and server-side validation. */

export const COLLECTIUS = ["Llibreries", "Editorials", "Entitats"] as const;
export type Collectiu = (typeof COLLECTIUS)[number];

export const PARTICIPACIO = [
  "Paradista",
  "Paradista i organització d’activitats annexes",
  "Organització d’activitats annexes",
] as const;

/** Participation values that unlock the "Activitats annexes" section. */
export const PARTICIPACIO_AMB_ACTIVITATS: readonly string[] = [
  PARTICIPACIO[1],
  PARTICIPACIO[2],
];

const SUFICIENT = ["Suficient", "Insuficient"];
const CORRECTA = ["Correcta", "Millorable"];
const SI_NO = ["Sí", "No"];
const ORGA = ["Molt bé", "Correcte", "S’ha de millorar"];
const SCALE = ["1", "2", "3", "4", "5"];

export type MatrixDef = {
  group: string;
  options: readonly string[];
  rows: readonly { key: string; label: string }[];
};

export const MATRICES: readonly MatrixDef[] = [
  {
    group: "difusio",
    options: SUFICIENT,
    rows: [
      { key: "web", label: "Xarxes · Web" },
      { key: "instagram", label: "Xarxes · Instagram" },
      { key: "whatsapp", label: "Xarxes · WhatsApp" },
      { key: "facebook", label: "Xarxes · Facebook" },
      { key: "pancartes", label: "Material imprès · pancartes" },
      { key: "triptic", label: "Material imprès · tríptic" },
      { key: "cartells", label: "Material imprès · cartells" },
      { key: "puntLlibre", label: "Material imprès · punt de llibre" },
      { key: "flaixos", label: "Vídeos · flaixos" },
      { key: "videoPromocional", label: "Vídeos · vídeo promocional" },
      { key: "premsa", label: "Mitjans locals · premsa" },
      { key: "radio", label: "Mitjans locals · ràdio" },
      { key: "tv", label: "Mitjans locals · TV" },
      { key: "rodaPremsa", label: "Mitjans locals · roda de premsa" },
      { key: "mes60", label: "Altres · +60" },
      { key: "factoriaZona60", label: "Altres · Factoria Zona60" },
      { key: "dadesFiresICEC", label: "Altres · Dades Fires ICEC" },
    ],
  },
  {
    group: "comunicacio",
    options: CORRECTA,
    rows: [
      { key: "correus", label: "Correus electrònics" },
      {
        key: "calendariReunions",
        label: "Calendari reunions presencials (preparació maig / valoració octubre)",
      },
      { key: "horariReunions", label: "Horari reunions (matins 8:00–9:00)" },
    ],
  },
  {
    group: "objectiusGenerals",
    options: SCALE,
    rows: [
      { key: "promocioLlibre", label: "Promocionar el llibre en català i estimular la lectura" },
      { key: "visibilitat", label: "Donar visibilitat a l’entramat literari de Terrassa i entorn" },
      { key: "xarxa", label: "Enfortir la xarxa literària" },
      { key: "dinamitzar", label: "Dinamitzar llibreries i editorials locals" },
    ],
  },
  {
    group: "objectiusAny",
    options: SI_NO,
    rows: [
      { key: "activitatsInteressants", label: "Les activitats han estat interessants?" },
      {
        key: "colloquiObjectius",
        label: "El col·loqui de presentació i la taula de llibreters van respondre als objectius?",
      },
    ],
  },
  {
    group: "calendari",
    options: SI_NO,
    rows: [
      { key: "rodaPremsa", label: "Roda de premsa: 1a setmana de setembre" },
      { key: "presentacio", label: "Presentació: mitjans de setembre" },
      { key: "activitatsAnnexes", label: "Activitats annexes: des de la roda fins al dia de la Fira" },
      { key: "diaFira", label: "Dia de la Fira: 1r dissabte d’octubre" },
    ],
  },
  {
    group: "presentacio",
    options: SI_NO,
    rows: [
      { key: "lloc", label: "Lloc (sala petita Cinema Catalunya) adequat?" },
      { key: "durada", label: "Durada adient?" },
      { key: "intervencions", label: "Intervencions interessants?" },
    ],
  },
  {
    group: "activitatsAnnexes",
    options: SCALE,
    rows: [
      { key: "nombre", label: "Nombre d’activitats" },
      { key: "expectatives", label: "Assoliment d’expectatives" },
      { key: "public", label: "Participació del públic" },
    ],
  },
  {
    group: "organitzacioDia",
    options: ORGA,
    rows: [
      { key: "horari", label: "Horari (muntar, desmuntar, atenció)" },
      { key: "emplacament", label: "Emplaçament Raval de Montserrat" },
      { key: "nombreParades", label: "Nombre de parades" },
      { key: "distribucioParades", label: "Distribució de parades" },
      { key: "cartells", label: "Cartells identificatius" },
      { key: "escenaris", label: "Escenaris (atri Ajuntament i tarima Mercat)" },
      { key: "panells", label: "Panells informatius (5 entrades)" },
      { key: "xarxaElectrica", label: "Xarxa elèctrica" },
      { key: "equipSo", label: "Equip de so" },
    ],
  },
  {
    group: "funcionament",
    options: SCALE,
    rows: [
      { key: "interesActivitats", label: "Interès de les activitats als dos escenaris" },
      { key: "convidats", label: "Convidats d’altres territoris" },
      { key: "afluencia", label: "Afluència de públic" },
      { key: "autors", label: "Participació d’autors / signatures" },
      { key: "promocioEntitat", label: "Importància per a la promoció de l’entitat" },
      { key: "valoracioEconomica", label: "Valoració econòmica de la venda de llibres" },
    ],
  },
];

/** Free-text fields: form element id === payload key. */
export const TEXT_FIELDS = [
  "difusioPropostes",
  "comunicacioPropostes",
  "objectiusAnyPropostes",
  "calendariPropostes",
  "presentacioSuggeriments",
  "activitatsAnnexesAltres",
  "organitzacioDiaPropostes",
  "funcionamentSuggeriments",
  "financament",
  "continuitatFira",
  "continuitatParticipacio",
  "altresComentaris",
] as const;

export const TEXT_MAX = 4000;
/** Upper bound for a legitimate request body (all texts full ≈ 50 KB of UTF-8). */
export const MAX_BODY_BYTES = 64 * 1024;

export type SurveyPayload = {
  collectiu: Collectiu;
  email: string;
  privacyConsent: true;
  participacio?: string;
} & { [group: string]: unknown };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSubmission(
  body: unknown,
): { ok: true; data: SurveyPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Cos de la petició invàlid." };
  }
  const raw = body as Record<string, unknown>;

  const collectiu = typeof raw.collectiu === "string" ? raw.collectiu : "";
  if (!COLLECTIUS.includes(collectiu as Collectiu)) {
    return { ok: false, error: "Cal indicar a quin col·lectiu pertanyeu." };
  }
  const email = normalizeEmail(typeof raw.email === "string" ? raw.email : "");
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: "Cal un correu electrònic vàlid." };
  }
  if (raw.privacyConsent !== true) {
    return {
      ok: false,
      error: "Cal acceptar el consentiment de privacitat per enviar l’enquesta.",
    };
  }

  const data: SurveyPayload = {
    collectiu: collectiu as Collectiu,
    email,
    privacyConsent: true,
  };

  if (raw.participacio !== undefined) {
    if (!(PARTICIPACIO as readonly unknown[]).includes(raw.participacio)) {
      return { ok: false, error: "Valor de participació invàlid." };
    }
    data.participacio = raw.participacio as string;
  }

  for (const m of MATRICES) {
    const v = raw[m.group];
    if (v === undefined) continue;
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      return { ok: false, error: `Resposta invàlida a «${m.group}».` };
    }
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const row = m.rows.find((r) => r.key === k);
      if (!row || typeof val !== "string" || !m.options.includes(val)) {
        return { ok: false, error: `Resposta invàlida a «${m.group}».` };
      }
      out[k] = val;
    }
    if (Object.keys(out).length) data[m.group] = out;
  }

  for (const key of TEXT_FIELDS) {
    const v = raw[key];
    if (v === undefined) continue;
    if (typeof v !== "string") {
      return { ok: false, error: `Resposta invàlida a «${key}».` };
    }
    const t = v.trim();
    if (t) data[key] = t.slice(0, TEXT_MAX);
  }

  return { ok: true, data };
}
