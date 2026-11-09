import { COLLECTIUS, PARTICIPACIO, type MatrixDef } from "../../survey";
import {
  type Dist,
  type Resp,
  distribution,
  fmtMean,
  fmtPct,
  globalScaleDist,
  isScale,
  matrixDist,
  matrixRespondents,
  rowDist,
  tones,
} from "./data";

type Child = Node | string | number | null | undefined | false;

/** Minimal element builder; `attrs` values of undefined/false are skipped. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean | undefined> | null,
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === false) continue;
    el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Tone (negative→positive) classes for rated options; neutral series for nominal ones. */
function optionClasses(options: readonly string[], nominal: boolean): string[] {
  return nominal ? options.map((_, i) => `cat-${i + 1}`) : tones(options).map((t) => `tone-${t}`);
}

export function stackedBar(options: readonly string[], dist: Dist, nominal = false): HTMLElement {
  if (!dist.n) return h("div", { class: "bar bar--empty" }, "Sense respostes");
  const cls = optionClasses(options, nominal);
  const bar = h("div", { class: "bar", role: "img" });
  const described: string[] = [];
  options.forEach((opt, i) => {
    const c = dist.counts[i];
    const pct = fmtPct(c, dist.n);
    described.push(`${opt}: ${pct} (${c})`);
    if (!c) return;
    const seg = h(
      "span",
      { class: `bar__seg ${cls[i]}`, title: `${opt}: ${c} (${pct})` },
      c / dist.n >= 0.12 ? pct : null,
    );
    seg.style.width = `${(c / dist.n) * 100}%`;
    bar.appendChild(seg);
  });
  bar.setAttribute("aria-label", described.join(", "));
  return bar;
}

export function meanBadge(mean: number | null): HTMLElement {
  const tone = mean === null ? 0 : Math.min(5, Math.max(1, Math.round(mean)));
  return h("span", { class: `mean tone-text-${tone}` }, fmtMean(mean));
}

export type DistRow = { label: string; dist: Dist; onOpen?: () => void; total?: boolean };

/** Question × option table with a stacked bar, per-option % (count), mean for 1–5 scales and n. */
export function distTable(
  options: readonly string[],
  rows: readonly DistRow[],
  nominal = false,
): HTMLElement {
  const scale = isScale(options);
  const cls = optionClasses(options, nominal);
  const head = h(
    "tr",
    null,
    h("th", { scope: "col", class: "dt__q" }, "Pregunta"),
    h("th", { scope: "col", class: "dt__bar" }, "Distribució"),
    options.map((o, i) =>
      h(
        "th",
        { scope: "col", class: "dt__opt" },
        h("span", { class: `swatch ${cls[i]}`, "aria-hidden": "true" }),
        o,
      ),
    ),
    scale ? h("th", { scope: "col", class: "dt__num" }, "Mitjana") : null,
    h("th", { scope: "col", class: "dt__num" }, "n"),
  );
  const body = rows.map((row) => {
    const label = row.onOpen
      ? h("button", { type: "button", class: "linkish" }, row.label)
      : row.label;
    if (row.onOpen && label instanceof HTMLButtonElement) {
      label.addEventListener("click", row.onOpen);
    }
    return h(
      "tr",
      { class: row.total ? "dt__total" : undefined },
      h("th", { scope: "row", class: "dt__q" }, label),
      h("td", { class: "dt__bar" }, stackedBar(options, row.dist, nominal)),
      options.map((_, i) =>
        h(
          "td",
          { class: "dt__opt" },
          row.dist.n ? fmtPct(row.dist.counts[i], row.dist.n) : "–",
          row.dist.n ? h("small", null, ` ${row.dist.counts[i]}`) : null,
        ),
      ),
      scale ? h("td", { class: "dt__num" }, meanBadge(row.dist.mean)) : null,
      h("td", { class: "dt__num" }, row.dist.n),
    );
  });
  return h(
    "div",
    { class: "dt-wrap" },
    h("table", { class: `dt${scale ? " dt--scale" : ""}` }, h("thead", null, head), h("tbody", null, body)),
  );
}

export function kpi(label: string, value: Child, sub?: Child): HTMLElement {
  return h(
    "div",
    { class: "kpi" },
    h("span", { class: "kpi__label" }, label),
    h("span", { class: "kpi__value" }, value),
    sub ? h("span", { class: "kpi__sub" }, sub) : null,
  );
}

export function summaryKpis(rs: readonly Resp[], total: number): HTMLElement {
  const global = globalScaleDist(rs);
  return h(
    "div",
    { class: "kpis" },
    kpi("Respostes", rs.length, rs.length === total ? "en total" : `de ${total} en total`),
    COLLECTIUS.map((c) => {
      const n = rs.filter((r) => r.p.collectiu === c).length;
      return kpi(c, n, fmtPct(n, rs.length));
    }),
    kpi("Valoració mitjana", h("span", null, meanBadge(global.mean), h("small", null, " / 5")), `${global.n} puntuacions de l’1 al 5`),
  );
}

/** Col·lectiu and participació distributions. */
export function profileTables(rs: readonly Resp[]): HTMLElement[] {
  const collectiu = distribution(
    rs.map((r) => r.p.collectiu),
    COLLECTIUS,
  );
  const participacio = distribution(
    rs.map((r) => r.p.participacio),
    PARTICIPACIO,
  );
  return [
    distTable(COLLECTIUS, [{ label: "Col·lectiu", dist: collectiu }], true),
    distTable(
      PARTICIPACIO,
      [
        {
          label: `Participació${rs.length > participacio.n ? ` (${rs.length - participacio.n} sense indicar)` : ""}`,
          dist: participacio,
        },
      ],
      true,
    ),
  ];
}

export function sectionMeta(rs: readonly Resp[], m: MatrixDef): HTMLElement {
  const respondents = matrixRespondents(rs, m);
  const pooled = matrixDist(rs, m);
  return h(
    "p",
    { class: "section-meta" },
    `${respondents} ${respondents === 1 ? "resposta" : "respostes"}`,
    isScale(m.options)
      ? h("span", null, " · Mitjana del bloc ", meanBadge(pooled.mean))
      : null,
  );
}

export function matrixTable(
  rs: readonly Resp[],
  m: MatrixDef,
  onOpen?: (row: MatrixDef["rows"][number]) => void,
): HTMLElement {
  return distTable(
    m.options,
    m.rows.map((row) => ({
      label: row.label,
      dist: rowDist(rs, m, row.key),
      onOpen: onOpen ? () => onOpen(row) : undefined,
    })),
  );
}
