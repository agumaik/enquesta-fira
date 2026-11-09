import "@fontsource/figtree/400.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/fraunces/700.css";
import { COLLECTIUS, MATRICES, PARTICIPACIO, SECTIONS, type MatrixDef, type SectionDef } from "../../survey";
import {
  type Filters,
  type Resp,
  NO_PARTICIPACIO,
  SessionError,
  TOTAL_QUESTIONS,
  answeredCount,
  applyFilters,
  filtersQuery,
  fmtDate,
  fmtPct,
  loadResponses,
  matrixAnswer,
  readFilters,
  rowDist,
  textAnswer,
  textAnswers,
  tones,
} from "./data";
import { distTable, h, matrixTable, profileTables, sectionMeta, summaryKpis } from "./ui";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const content = $<HTMLElement>("content");
const status = $<HTMLElement>("status");
const filtersEl = $<HTMLElement>("filters");
const reportLink = $<HTMLAnchorElement>("report-link");
const drawer = $<HTMLDialogElement>("drawer");
const drawerTitle = $<HTMLElement>("drawer-title");
const drawerBody = $<HTMLElement>("drawer-body");
const drawerBack = $<HTMLButtonElement>("drawer-back");

let all: Resp[] = [];
let filters: Filters = readFilters(new URLSearchParams(location.search));

/* ---------- Side panel ---------- */

type Panel = { title: string; render: () => Node[] };
const stack: Panel[] = [];

function showTop() {
  const top = stack[stack.length - 1];
  drawerTitle.textContent = top.title;
  drawerBody.replaceChildren(...top.render());
  drawerBack.hidden = stack.length < 2;
  drawerBody.scrollTop = 0;
}

function openPanel(panel: Panel, push = false) {
  if (!push || !drawer.open) stack.length = 0;
  stack.push(panel);
  showTop();
  if (!drawer.open) drawer.showModal();
}

drawerBack.addEventListener("click", () => {
  stack.pop();
  showTop();
});
$<HTMLButtonElement>("drawer-close").addEventListener("click", () => drawer.close());
drawer.addEventListener("close", () => {
  stack.length = 0;
});
// Clicks on the backdrop target the <dialog> itself.
drawer.addEventListener("click", (e) => {
  if (e.target === drawer) drawer.close();
});

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function respondentMeta(r: Resp): HTMLElement {
  return h(
    "p",
    { class: "answer__meta" },
    h("span", { class: "chip" }, r.p.collectiu),
    r.p.participacio ? h("span", null, r.p.participacio) : null,
    h("time", { datetime: r.createdAt.toISOString() }, fmtDate(r.createdAt)),
    h("a", { href: `mailto:${r.p.email}` }, r.p.email),
  );
}

function openResponseButton(r: Resp): HTMLButtonElement {
  const b = h("button", { type: "button", class: "linkish answer__open" }, "Resposta completa →");
  b.addEventListener("click", () => openPanel(responsePanel(r), true));
  return b;
}

function textPanel(t: SectionDef["texts"][number], section: SectionDef, rs: readonly Resp[]): Panel {
  return {
    title: t.label,
    render: () => {
      const answers = textAnswers(rs, t.key);
      const search = h("input", {
        type: "search",
        class: "drawer__search",
        placeholder: "Cerca a les respostes…",
        "aria-label": "Cerca a les respostes",
      });
      const count = h("p", { class: "drawer__count" });
      const list = h("ol", { class: "answers" });
      const paint = () => {
        const q = norm(search.value.trim());
        const shown = answers.filter(
          (a) => !q || norm(`${a.text} ${a.r.p.collectiu} ${a.r.p.email}`).includes(q),
        );
        count.textContent = q
          ? `${shown.length} de ${answers.length} respostes`
          : `${answers.length} respostes`;
        list.replaceChildren(
          ...shown.map((a) =>
            h(
              "li",
              { class: "answer" },
              h("p", { class: "answer__text" }, a.text),
              respondentMeta(a.r),
              openResponseButton(a.r),
            ),
          ),
        );
      };
      search.addEventListener("input", paint);
      paint();
      return [h("p", { class: "drawer__context" }, section.title), search, count, list];
    },
  };
}

function rowPanel(m: MatrixDef, row: MatrixDef["rows"][number], section: SectionDef, rs: readonly Resp[]): Panel {
  return {
    title: row.label,
    render: () => {
      const t = tones(m.options);
      const answered = rs.filter((r) => matrixAnswer(r, m.group, row.key) !== undefined);
      return [
        h("p", { class: "drawer__context" }, section.title),
        h("h3", null, "Per col·lectiu"),
        distTable(m.options, [
          ...COLLECTIUS.map((c) => ({
            label: c,
            dist: rowDist(
              rs.filter((r) => r.p.collectiu === c),
              m,
              row.key,
            ),
          })),
          { label: "Total", dist: rowDist(rs, m, row.key), total: true },
        ]),
        h("h3", null, `Respostes individuals (${answered.length})`),
        h(
          "ol",
          { class: "answers" },
          answered.map((r) => {
            const v = matrixAnswer(r, m.group, row.key) as string;
            return h(
              "li",
              { class: "answer answer--row" },
              h("span", { class: `value tone-${t[m.options.indexOf(v)]}` }, v),
              respondentMeta(r),
              openResponseButton(r),
            );
          }),
        ),
      ];
    },
  };
}

function responsePanel(r: Resp): Panel {
  return {
    title: `Resposta · ${r.p.collectiu}`,
    render: () => {
      const answered = answeredCount(r);
      const nodes: Node[] = [
        h(
          "dl",
          { class: "facts" },
          h("dt", null, "Data"),
          h("dd", null, fmtDate(r.createdAt)),
          h("dt", null, "Correu"),
          h("dd", null, h("a", { href: `mailto:${r.p.email}` }, r.p.email)),
          h("dt", null, "Col·lectiu"),
          h("dd", null, r.p.collectiu),
          h("dt", null, "Participació"),
          h("dd", null, r.p.participacio ?? "Sense indicar"),
          h("dt", null, "Preguntes respostes"),
          h("dd", null, `${answered} de ${TOTAL_QUESTIONS} (${fmtPct(answered, TOTAL_QUESTIONS)})`),
        ),
      ];
      for (const s of SECTIONS) {
        const m = s.matrix ? MATRICES.find((x) => x.group === s.matrix) : undefined;
        const items: Node[] = [];
        if (m) {
          const t = tones(m.options);
          for (const row of m.rows) {
            const v = matrixAnswer(r, m.group, row.key);
            if (v === undefined) continue;
            items.push(
              h(
                "li",
                { class: "kv" },
                h("span", null, row.label),
                h("span", { class: `value tone-${t[m.options.indexOf(v)]}` }, v),
              ),
            );
          }
        }
        for (const t of s.texts) {
          const text = textAnswer(r, t.key);
          if (!text) continue;
          items.push(
            h("li", { class: "kv kv--text" }, h("span", null, t.label), h("p", { class: "answer__text" }, text)),
          );
        }
        nodes.push(
          h(
            "section",
            { class: "rsec" },
            h("h3", null, s.title),
            items.length ? h("ul", { class: "kvs" }, items) : h("p", { class: "muted" }, "Sense resposta."),
          ),
        );
      }
      return nodes;
    },
  };
}

/* ---------- Page ---------- */

function sectionId(i: number) {
  return `s-${i}`;
}

function renderFilters() {
  const coll = h(
    "select",
    { id: "f-collectiu" },
    h("option", { value: "" }, `Tots (${all.length})`),
    COLLECTIUS.map((c) =>
      h(
        "option",
        { value: c, selected: filters.collectiu === c },
        `${c} (${all.filter((r) => r.p.collectiu === c).length})`,
      ),
    ),
  );
  const part = h(
    "select",
    { id: "f-participacio" },
    h("option", { value: "" }, "Totes"),
    PARTICIPACIO.map((p) => h("option", { value: p, selected: filters.participacio === p }, p)),
    h("option", { value: NO_PARTICIPACIO, selected: filters.participacio === NO_PARTICIPACIO }, "Sense indicar"),
  );
  const onChange = () => setFilters({ collectiu: coll.value, participacio: part.value });
  coll.addEventListener("change", onChange);
  part.addEventListener("change", onChange);
  const active = filters.collectiu || filters.participacio;
  const clear = h("button", { type: "button", class: "linkish", hidden: !active }, "Treu els filtres");
  clear.addEventListener("click", () => setFilters({ collectiu: "", participacio: "" }));

  filtersEl.replaceChildren(
    h("label", null, h("span", null, "Col·lectiu"), coll),
    h("label", null, h("span", null, "Participació"), part),
    clear,
    h(
      "nav",
      { class: "toc", "aria-label": "Apartats" },
      h("a", { href: "#perfil" }, "Perfil"),
      SECTIONS.map((s, i) => h("a", { href: `#${sectionId(i)}` }, s.title)),
      h("a", { href: "#respostes" }, "Respostes"),
    ),
  );
}

function setFilters(f: Filters) {
  filters = f;
  history.replaceState(null, "", location.pathname + filtersQuery(f) + location.hash);
  render();
}

function textCard(rs: readonly Resp[], s: SectionDef, t: SectionDef["texts"][number]): HTMLElement {
  const answers = textAnswers(rs, t.key);
  const card = h(
    "article",
    { class: "tcard" },
    h("h3", null, t.label),
    h("p", { class: "tcard__count" }, `${answers.length} ${answers.length === 1 ? "resposta" : "respostes"}`),
    answers.slice(0, 2).map((a) =>
      h("blockquote", { class: "tcard__preview" }, a.text, h("cite", null, a.r.p.collectiu)),
    ),
  );
  if (answers.length) {
    const btn = h("button", { type: "button", class: "btn btn--small btn--ghost" }, `Veure totes les respostes (${answers.length})`);
    btn.addEventListener("click", () => openPanel(textPanel(t, s, rs)));
    card.appendChild(btn);
  } else {
    card.appendChild(h("p", { class: "muted" }, "Encara no hi ha respostes."));
  }
  return card;
}

function sectionCard(rs: readonly Resp[], s: SectionDef, i: number): HTMLElement {
  const m = s.matrix ? MATRICES.find((x) => x.group === s.matrix) : undefined;
  return h(
    "section",
    { class: "card", id: sectionId(i) },
    h("header", { class: "card__head" }, h("h2", null, s.title), m ? sectionMeta(rs, m) : null),
    s.note ? h("p", { class: "card__note" }, s.note) : null,
    m ? h("p", { class: "card__hint" }, "Feu clic en una pregunta per veure-la per col·lectiu i les respostes individuals.") : null,
    m ? matrixTable(rs, m, (row) => openPanel(rowPanel(m, row, s, rs))) : null,
    s.texts.length ? h("div", { class: "tcards" }, s.texts.map((t) => textCard(rs, s, t))) : null,
  );
}

function responsesCard(rs: readonly Resp[]): HTMLElement {
  return h(
    "section",
    { class: "card", id: "respostes" },
    h("header", { class: "card__head" }, h("h2", null, "Respostes individuals"), h("p", { class: "section-meta" }, `${rs.length} respostes`)),
    h(
      "div",
      { class: "dt-wrap" },
      h(
        "table",
        { class: "rtable" },
        h(
          "thead",
          null,
          h("tr", null, ["Data", "Col·lectiu", "Participació", "Correu", "Completesa"].map((c) => h("th", { scope: "col" }, c))),
        ),
        h(
          "tbody",
          null,
          rs.map((r) => {
            const open = h("button", { type: "button", class: "linkish" }, fmtDate(r.createdAt));
            open.addEventListener("click", () => openPanel(responsePanel(r)));
            const n = answeredCount(r);
            return h(
              "tr",
              null,
              h("th", { scope: "row" }, open),
              h("td", null, r.p.collectiu),
              h("td", null, r.p.participacio ?? "–"),
              h("td", null, r.p.email),
              h("td", { class: "dt__num" }, fmtPct(n, TOTAL_QUESTIONS)),
            );
          }),
        ),
      ),
    ),
  );
}

function render() {
  renderFilters();
  reportLink.href = `/admin/informe${filtersQuery(filters)}`;
  const rs = applyFilters(all, filters);
  if (!all.length) {
    status.hidden = false;
    status.textContent = "Encara no s’ha rebut cap resposta.";
    content.replaceChildren();
    return;
  }
  status.hidden = rs.length > 0;
  status.textContent = rs.length ? "" : "Cap resposta no coincideix amb els filtres.";
  content.replaceChildren(
    summaryKpis(rs, all.length),
    h(
      "section",
      { class: "card", id: "perfil" },
      h("header", { class: "card__head" }, h("h2", null, "Perfil · Identificació i participació")),
      profileTables(rs),
    ),
    ...SECTIONS.map((s, i) => sectionCard(rs, s, i)),
    responsesCard(rs),
  );
}

async function init() {
  try {
    const data = await loadResponses();
    all = data.responses;
    $<HTMLElement>("viewer").textContent = data.viewer;
    render();
  } catch (err) {
    status.hidden = false;
    status.classList.add("dash__status--error");
    if (err instanceof SessionError) {
      status.replaceChildren(
        "La sessió de Cloudflare Access ha caducat. ",
        h("a", { href: location.href }, "Torna a iniciar sessió"),
        ".",
      );
    } else {
      status.textContent = err instanceof Error ? err.message : String(err);
    }
  }
}

void init();
