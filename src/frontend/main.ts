type OptionSet = string[];

type MatrixDef = {
  containerId: string;
  groupName: string;
  options: OptionSet;
  rows: { key: string; label: string }[];
};

const SUFICIENT = ["Suficient", "Insuficient"];
const CORRECTA = ["Correcta", "Millorable"];
const SI_NO = ["Sí", "No"];
const ORGA = ["Molt bé", "Correcte", "S’ha de millorar"];
const SCALE = ["1", "2", "3", "4", "5"];

const MATRICES: MatrixDef[] = [
  {
    containerId: "difusio-matrix",
    groupName: "difusio",
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
    containerId: "comunicacio-matrix",
    groupName: "comunicacio",
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
    containerId: "objectiusGenerals-matrix",
    groupName: "objectiusGenerals",
    options: SCALE,
    rows: [
      {
        key: "promocioLlibre",
        label: "Promocionar el llibre en català i estimular la lectura",
      },
      {
        key: "visibilitat",
        label: "Donar visibilitat a l’entramat literari de Terrassa i entorn",
      },
      { key: "xarxa", label: "Enfortir la xarxa literària" },
      {
        key: "dinamitzar",
        label: "Dinamitzar llibreries i editorials locals",
      },
    ],
  },
  {
    containerId: "objectiusAny-matrix",
    groupName: "objectiusAny",
    options: SI_NO,
    rows: [
      { key: "activitatsInteressants", label: "Les activitats han estat interessants?" },
      {
        key: "colloquiObjectius",
        label:
          "El col·loqui de presentació i la taula de llibreters van respondre als objectius?",
      },
    ],
  },
  {
    containerId: "calendari-matrix",
    groupName: "calendari",
    options: SI_NO,
    rows: [
      { key: "rodaPremsa", label: "Roda de premsa: 1a setmana de setembre" },
      { key: "presentacio", label: "Presentació: mitjans de setembre" },
      {
        key: "activitatsAnnexes",
        label: "Activitats annexes: des de la roda fins al dia de la Fira",
      },
      { key: "diaFira", label: "Dia de la Fira: 1r dissabte d’octubre" },
    ],
  },
  {
    containerId: "presentacio-matrix",
    groupName: "presentacio",
    options: SI_NO,
    rows: [
      {
        key: "lloc",
        label: "Lloc (sala petita Cinema Catalunya) adequat?",
      },
      { key: "durada", label: "Durada adient?" },
      { key: "intervencions", label: "Intervencions interessants?" },
    ],
  },
  {
    containerId: "activitatsAnnexes-matrix",
    groupName: "activitatsAnnexes",
    options: SCALE,
    rows: [
      { key: "nombre", label: "Nombre d’activitats" },
      { key: "expectatives", label: "Assoliment d’expectatives" },
      { key: "public", label: "Participació del públic" },
    ],
  },
  {
    containerId: "organitzacioDia-matrix",
    groupName: "organitzacioDia",
    options: ORGA,
    rows: [
      { key: "horari", label: "Horari (muntar, desmuntar, atenció)" },
      { key: "emplacament", label: "Emplaçament Raval de Montserrat" },
      { key: "nombreParades", label: "Nombre de parades" },
      { key: "distribucioParades", label: "Distribució de parades" },
      { key: "cartells", label: "Cartells identificatius" },
      {
        key: "escenaris",
        label: "Escenaris (atri Ajuntament i tarima Mercat)",
      },
      { key: "panells", label: "Panells informatius (5 entrades)" },
      { key: "xarxaElectrica", label: "Xarxa elèctrica" },
      { key: "equipSo", label: "Equip de so" },
    ],
  },
  {
    containerId: "funcionament-matrix",
    groupName: "funcionament",
    options: SCALE,
    rows: [
      {
        key: "interesActivitats",
        label: "Interès de les activitats als dos escenaris",
      },
      {
        key: "convidats",
        label: "Convidats d’altres territoris",
      },
      { key: "afluencia", label: "Afluència de públic" },
      {
        key: "autors",
        label: "Participació d’autors / signatures",
      },
      {
        key: "promocioEntitat",
        label: "Importància per a la promoció de l’entitat",
      },
      {
        key: "valoracioEconomica",
        label: "Valoració econòmica de la venda de llibres",
      },
    ],
  },
];

function renderMatrices() {
  for (const matrix of MATRICES) {
    const root = document.getElementById(matrix.containerId);
    if (!root) continue;
    root.replaceChildren();

    for (const row of matrix.rows) {
      const rowEl = document.createElement("div");
      rowEl.className = "matrix-row";

      const label = document.createElement("div");
      label.className = "matrix-row__label";
      label.textContent = row.label;
      rowEl.appendChild(label);

      const options = document.createElement("div");
      options.className = "matrix-row__options";
      options.setAttribute("role", "radiogroup");
      options.setAttribute("aria-label", row.label);

      for (const opt of matrix.options) {
        const id = `${matrix.groupName}-${row.key}-${opt}`;
        const lab = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `${matrix.groupName}.${row.key}`;
        input.value = opt;
        input.id = id;
        lab.htmlFor = id;
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(` ${opt}`));
        options.appendChild(lab);
      }

      rowEl.appendChild(options);
      root.appendChild(rowEl);
    }
  }
}

function readMatrix(groupName: string): Record<string, string> {
  const out: Record<string, string> = {};
  const inputs = document.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][name^="${groupName}."]:checked`,
  );
  for (const input of inputs) {
    const key = input.name.slice(groupName.length + 1);
    if (key) out[key] = input.value;
  }
  return out;
}

function radioValue(name: string): string | undefined {
  const el = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]:checked`,
  );
  return el?.value;
}

function textValue(id: string): string {
  const el = document.getElementById(id) as HTMLTextAreaElement | HTMLInputElement | null;
  return el?.value.trim() ?? "";
}

function setStatus(message: string, kind: "error" | "ok" | "info") {
  const box = document.getElementById("form-status");
  if (!box) return;
  box.hidden = !message;
  box.textContent = message;
  box.className = "form-status";
  if (kind === "error") box.classList.add("form-status--error");
  if (kind === "ok") box.classList.add("form-status--ok");
}

function collectPayload() {
  const collectiu = radioValue("collectiu");
  const email = textValue("email");
  const privacyConsent = (
    document.getElementById("privacyConsent") as HTMLInputElement | null
  )?.checked;

  const payload: Record<string, unknown> = {
    collectiu,
    email,
    privacyConsent: privacyConsent === true,
  };

  const participacio = radioValue("participacio");
  if (participacio) payload.participacio = participacio;

  const mapFields: [string, string][] = [
    ["difusio", "difusio"],
    ["comunicacio", "comunicacio"],
    ["objectiusGenerals", "objectiusGenerals"],
    ["objectiusAny", "objectiusAny"],
    ["calendari", "calendari"],
    ["presentacio", "presentacio"],
    ["activitatsAnnexes", "activitatsAnnexes"],
    ["organitzacioDia", "organitzacioDia"],
    ["funcionament", "funcionament"],
  ];

  for (const [group, key] of mapFields) {
    const map = readMatrix(group);
    if (Object.keys(map).length) payload[key] = map;
  }

  const texts = [
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

  for (const id of texts) {
    const v = textValue(id);
    if (v) payload[id] = v;
  }

  return payload;
}

function lockForm(closedMessage: string) {
  const form = document.getElementById("enquesta") as HTMLFormElement | null;
  const banner = document.getElementById("status-banner");
  const message = document.getElementById("status-message");
  if (form) {
    form.classList.add("is-closed");
    form.setAttribute("aria-disabled", "true");
    for (const el of form.elements) {
      if (el instanceof HTMLElement && "disabled" in el) {
        (el as HTMLInputElement).disabled = true;
      }
    }
  }
  if (banner && message) {
    banner.hidden = false;
    message.textContent = closedMessage;
  }
}

async function loadStatus() {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) return;
    const data = (await res.json()) as { open?: boolean };
    if (data.open === false) {
      lockForm(
        "L’enquesta està tancada. Ja no s’accepten més respostes. Gràcies!",
      );
    }
  } catch {
    // Local preview without worker: keep form usable.
  }
}

async function onSubmit(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const btn = document.getElementById("submit-btn") as HTMLButtonElement | null;

  if (!form.reportValidity()) {
    setStatus("Reviseu els camps obligatoris abans d’enviar.", "error");
    return;
  }

  const payload = collectPayload();
  setStatus("S’està enviant la valoració…", "info");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
    };

    if (res.status === 409) {
      setStatus(
        data.error ??
          "Ja hi ha una resposta amb aquest correu. Només se’n permet una.",
        "error",
      );
      if (btn) btn.disabled = false;
      return;
    }

    if (res.status === 403) {
      lockForm(
        data.error ??
          "L’enquesta està tancada. Ja no s’accepten més respostes.",
      );
      setStatus(data.error ?? "L’enquesta està tancada.", "error");
      return;
    }

    if (!res.ok) {
      setStatus(data.error ?? "No s’ha pogut enviar. Torneu-ho a provar.", "error");
      if (btn) btn.disabled = false;
      return;
    }

    form.hidden = true;
    const thanks = document.getElementById("thanks");
    if (thanks) {
      thanks.hidden = false;
      thanks.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch {
    setStatus(
      "Error de connexió. Comproveu la xarxa i torneu-ho a provar.",
      "error",
    );
    if (btn) btn.disabled = false;
  }
}

renderMatrices();
void loadStatus();
document.getElementById("enquesta")?.addEventListener("submit", onSubmit);
