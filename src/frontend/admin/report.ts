import "@fontsource/figtree/400.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/fraunces/700.css";
import { MATRICES, SECTIONS } from "../../survey";
import {
  SessionError,
  applyFilters,
  describeFilters,
  filtersQuery,
  fmtDay,
  loadResponses,
  readFilters,
  textAnswers,
} from "./data";
import { h, matrixTable, profileTables, sectionMeta, summaryKpis } from "./ui";

const body = document.getElementById("report-body") as HTMLElement;
const meta = document.getElementById("report-meta") as HTMLElement;
const printBtn = document.getElementById("print-btn") as HTMLButtonElement;
const filters = readFilters(new URLSearchParams(location.search));

(document.getElementById("back-link") as HTMLAnchorElement).href = `/admin/${filtersQuery(filters)}`;
printBtn.addEventListener("click", () => window.print());

async function init() {
  try {
    const { responses } = await loadResponses();
    const rs = applyFilters(responses, filters);
    const today = fmtDay(new Date());
    document.title = `Informe enquesta Fira del Llibre · ${describeFilters(filters)} · ${today}`;
    meta.textContent = `${describeFilters(filters)} · ${rs.length} respostes · Generat el ${today}`;

    if (!rs.length) {
      body.replaceChildren(h("p", { class: "muted" }, "No hi ha respostes per a aquests filtres."));
      return;
    }

    body.replaceChildren(
      summaryKpis(rs, responses.length),
      h("section", { class: "rsection" }, h("h2", null, "Perfil · Identificació i participació"), profileTables(rs)),
      ...SECTIONS.map((s) => {
        const m = s.matrix ? MATRICES.find((x) => x.group === s.matrix) : undefined;
        return h(
          "section",
          { class: "rsection" },
          h("h2", null, s.title),
          m ? sectionMeta(rs, m) : null,
          s.note ? h("p", { class: "card__note" }, s.note) : null,
          m ? matrixTable(rs, m) : null,
          s.texts.map((t) => {
            const answers = textAnswers(rs, t.key);
            return h(
              "div",
              { class: "rtexts" },
              h("h3", null, `${t.label} (${answers.length})`),
              answers.length
                ? h(
                    "ol",
                    { class: "rtexts__list" },
                    answers.map((a) =>
                      h(
                        "li",
                        null,
                        h("p", { class: "answer__text" }, a.text),
                        h("p", { class: "rtexts__who" }, `${a.r.p.collectiu} · ${fmtDay(a.r.createdAt)}`),
                      ),
                    ),
                  )
                : h("p", { class: "muted" }, "Cap resposta."),
            );
          }),
        );
      }),
    );
    printBtn.disabled = false;
  } catch (err) {
    body.replaceChildren(
      h(
        "p",
        { class: "dash__status dash__status--error" },
        err instanceof SessionError
          ? "La sessió de Cloudflare Access ha caducat. Torneu a carregar la pàgina."
          : err instanceof Error
            ? err.message
            : String(err),
      ),
    );
  }
}

void init();
