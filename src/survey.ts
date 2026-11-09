/** Shared survey field definitions and validation helpers. */

export const COLLECTIUS = [
  "Llibreries",
  "Editorials",
  "Entitats",
] as const;

export type Collectiu = (typeof COLLECTIUS)[number];

export const PARTICIPACIO = [
  "Paradista",
  "Paradista i organització d’activitats annexes",
  "Organització d’activitats annexes",
] as const;

export const SUFICIENT = ["Suficient", "Insuficient"] as const;
export const CORRECTA = ["Correcta", "Millorable"] as const;
export const SI_NO = ["Sí", "No"] as const;
export const ORGA_DIA = ["Molt bé", "Correcte", "S’ha de millorar"] as const;
export const SCALE_1_5 = ["1", "2", "3", "4", "5"] as const;

export type SurveyPayload = {
  collectiu: Collectiu;
  email: string;
  privacyConsent: true;
  participacio?: string;
  difusio?: Record<string, string>;
  difusioPropostes?: string;
  comunicacio?: Record<string, string>;
  comunicacioPropostes?: string;
  objectiusGenerals?: Record<string, string>;
  objectiusAny?: Record<string, string>;
  objectiusAnyPropostes?: string;
  calendari?: Record<string, string>;
  calendariPropostes?: string;
  presentacio?: Record<string, string>;
  presentacioSuggeriments?: string;
  activitatsAnnexes?: Record<string, string>;
  activitatsAnnexesAltres?: string;
  organitzacioDia?: Record<string, string>;
  organitzacioDiaPropostes?: string;
  funcionament?: Record<string, string>;
  funcionamentSuggeriments?: string;
  financament?: string;
  continuitatFira?: string;
  continuitatParticipacio?: string;
  altresComentaris?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSubmission(body: unknown):
  | { ok: true; data: SurveyPayload }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Cos de la petició invàlid." };
  }

  const raw = body as Record<string, unknown>;
  const collectiu = String(raw.collectiu ?? "").trim();
  const email = normalizeEmail(String(raw.email ?? ""));
  const privacyConsent = raw.privacyConsent === true;

  if (!COLLECTIUS.includes(collectiu as Collectiu)) {
    return {
      ok: false,
      error: "Cal indicar a quin col·lectiu pertanyeu.",
    };
  }
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: "Cal un correu electrònic vàlid." };
  }
  if (!privacyConsent) {
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

  const copyStr = (key: keyof SurveyPayload, max = 4000) => {
    const v = raw[key as string];
    if (typeof v === "string" && v.trim()) {
      (data as Record<string, unknown>)[key] = v.trim().slice(0, max);
    }
  };

  const copyMap = (key: keyof SurveyPayload) => {
    const v = raw[key as string];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (typeof val === "string" && val.trim()) {
          out[k] = val.trim().slice(0, 200);
        }
      }
      if (Object.keys(out).length) {
        (data as Record<string, unknown>)[key] = out;
      }
    }
  };

  if (typeof raw.participacio === "string" && raw.participacio.trim()) {
    data.participacio = raw.participacio.trim().slice(0, 200);
  }

  copyMap("difusio");
  copyStr("difusioPropostes");
  copyMap("comunicacio");
  copyStr("comunicacioPropostes");
  copyMap("objectiusGenerals");
  copyMap("objectiusAny");
  copyStr("objectiusAnyPropostes");
  copyMap("calendari");
  copyStr("calendariPropostes");
  copyMap("presentacio");
  copyStr("presentacioSuggeriments");
  copyMap("activitatsAnnexes");
  copyStr("activitatsAnnexesAltres");
  copyMap("organitzacioDia");
  copyStr("organitzacioDiaPropostes");
  copyMap("funcionament");
  copyStr("funcionamentSuggeriments");
  copyStr("financament");
  copyStr("continuitatFira");
  copyStr("continuitatParticipacio");
  copyStr("altresComentaris");

  return { ok: true, data };
}
