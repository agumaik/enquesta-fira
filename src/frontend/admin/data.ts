import { COLLECTIUS, MATRICES, PARTICIPACIO, TEXT_FIELDS, type MatrixDef } from "../../survey";

export type Payload = {
  collectiu: string;
  email: string;
  participacio?: string;
} & Record<string, unknown>;

export type Resp = { id: string; createdAt: Date; p: Payload };

/** Raised when the Access session is gone (the API answers with a login redirect). */
export class SessionError extends Error {}

export async function loadResponses(): Promise<{ viewer: string; responses: Resp[] }> {
  const res = await fetch("/admin/api/responses", {
    headers: { accept: "application/json" },
    redirect: "manual",
  });
  if (res.type === "opaqueredirect" || res.status === 401 || res.status === 403) {
    throw new SessionError("La sessió ha caducat.");
  }
  if (!res.ok) throw new Error(`Error ${res.status} en carregar les respostes.`);
  const data = (await res.json()) as {
    viewer: string;
    responses: { id: string; createdAt: string; payload: Payload }[];
  };
  return {
    viewer: data.viewer,
    responses: data.responses.map((r) => ({
      id: r.id,
      // D1 datetime('now') is UTC without zone: "YYYY-MM-DD HH:MM:SS".
      createdAt: new Date(`${r.createdAt.replace(" ", "T")}Z`),
      p: r.payload,
    })),
  };
}

/* ---------- Filters (shared by the dashboard and the report via the query string) ---------- */

export const NO_PARTICIPACIO = "-";

export type Filters = { collectiu: string; participacio: string };

export function readFilters(params: URLSearchParams): Filters {
  const collectiu = params.get("collectiu") ?? "";
  const participacio = params.get("participacio") ?? "";
  return {
    collectiu: (COLLECTIUS as readonly string[]).includes(collectiu) ? collectiu : "",
    participacio:
      participacio === NO_PARTICIPACIO || (PARTICIPACIO as readonly string[]).includes(participacio)
        ? participacio
        : "",
  };
}

export function filtersQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.collectiu) q.set("collectiu", f.collectiu);
  if (f.participacio) q.set("participacio", f.participacio);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function describeFilters(f: Filters): string {
  const parts = [f.collectiu || "Tots els col·lectius"];
  if (f.participacio) {
    parts.push(f.participacio === NO_PARTICIPACIO ? "Participació sense indicar" : f.participacio);
  }
  return parts.join(" · ");
}

export function applyFilters(rs: readonly Resp[], f: Filters): Resp[] {
  return rs.filter(
    (r) =>
      (!f.collectiu || r.p.collectiu === f.collectiu) &&
      (!f.participacio || (r.p.participacio ?? NO_PARTICIPACIO) === f.participacio),
  );
}

/* ---------- Aggregation ---------- */

export type Dist = { counts: number[]; n: number; mean: number | null };

export function isScale(options: readonly string[]): boolean {
  return options.every((o) => /^\d+$/.test(o));
}

export function distribution(
  values: readonly (string | undefined)[],
  options: readonly string[],
): Dist {
  const counts = options.map(() => 0);
  for (const v of values) {
    const i = v === undefined ? -1 : options.indexOf(v);
    if (i >= 0) counts[i]++;
  }
  const n = counts.reduce((a, b) => a + b, 0);
  const mean =
    isScale(options) && n
      ? counts.reduce((acc, c, i) => acc + c * Number(options[i]), 0) / n
      : null;
  return { counts, n, mean };
}

export function matrixAnswer(r: Resp, group: string, key: string): string | undefined {
  const g = r.p[group];
  if (!g || typeof g !== "object") return undefined;
  const v = (g as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

export function rowDist(rs: readonly Resp[], m: MatrixDef, key: string): Dist {
  return distribution(
    rs.map((r) => matrixAnswer(r, m.group, key)),
    m.options,
  );
}

/** Pooled distribution of every answer in a matrix (block mean for 1–5 scales). */
export function matrixDist(rs: readonly Resp[], m: MatrixDef): Dist {
  return distribution(
    rs.flatMap((r) => m.rows.map((row) => matrixAnswer(r, m.group, row.key))),
    m.options,
  );
}

/** Responses that answered at least one row of the matrix. */
export function matrixRespondents(rs: readonly Resp[], m: MatrixDef): number {
  return rs.filter((r) => m.rows.some((row) => matrixAnswer(r, m.group, row.key) !== undefined))
    .length;
}

/** Pooled 1–5 ratings across every scale matrix. */
export function globalScaleDist(rs: readonly Resp[]): Dist {
  const scale = MATRICES.find((m) => isScale(m.options));
  if (!scale) return { counts: [], n: 0, mean: null };
  return distribution(
    MATRICES.filter((m) => isScale(m.options)).flatMap((m) =>
      rs.flatMap((r) => m.rows.map((row) => matrixAnswer(r, m.group, row.key))),
    ),
    scale.options,
  );
}

export function textAnswer(r: Resp, key: string): string | undefined {
  const v = r.p[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function textAnswers(rs: readonly Resp[], key: string): { r: Resp; text: string }[] {
  return rs.flatMap((r) => {
    const text = textAnswer(r, key);
    return text ? [{ r, text }] : [];
  });
}

/** Number of questions (matrix rows + free texts) answered in a response. */
export function answeredCount(r: Resp): number {
  let n = 0;
  for (const m of MATRICES) {
    for (const row of m.rows) if (matrixAnswer(r, m.group, row.key) !== undefined) n++;
  }
  for (const key of TEXT_FIELDS) if (textAnswer(r, key)) n++;
  return n;
}

export const TOTAL_QUESTIONS =
  MATRICES.reduce((acc, m) => acc + m.rows.length, 0) + TEXT_FIELDS.length;

/**
 * Colour tone per option, 1 (negative) … 5 (positive). Numeric scales go 1→5;
 * the categorical option lists are written positive first.
 */
export function tones(options: readonly string[]): number[] {
  if (isScale(options)) return options.map((o) => Math.min(5, Math.max(1, Number(o))));
  if (options.length === 2) return [5, 2];
  if (options.length === 3) return [5, 3, 1];
  return options.map(() => 3);
}

/* ---------- Formatting ---------- */

const meanFmt = new Intl.NumberFormat("ca", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pctFmt = new Intl.NumberFormat("ca", { style: "percent", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("ca", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});
const dayFmt = new Intl.DateTimeFormat("ca", { dateStyle: "long", timeZone: "Europe/Madrid" });

export const fmtMean = (x: number | null): string => (x === null ? "–" : meanFmt.format(x));
export const fmtPct = (part: number, total: number): string =>
  total ? pctFmt.format(part / total) : "–";
export const fmtDate = (d: Date): string => dateFmt.format(d);
export const fmtDay = (d: Date): string => dayFmt.format(d);
