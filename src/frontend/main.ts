import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/700.css";
import {
  MATRICES,
  PARTICIPACIO_AMB_ACTIVITATS,
  TEXT_FIELDS,
} from "../survey";

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: Record<string, unknown>): string;
      execute(id: string): void;
      reset(id: string): void;
    };
  }
}

const DRAFT_KEY = "enquesta-fira:esborrany";
const CODE_KEY = "enquesta-fira:codi";
const ACTIVITATS_GROUP = "activitatsAnnexes";
const ACTIVITATS_TEXT = "activitatsAnnexesAltres";

const form = document.getElementById("enquesta") as HTMLFormElement;
const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
const activitatsBlock = document.getElementById("activitatsAnnexes-block") as HTMLElement;

function renderMatrices() {
  for (const matrix of MATRICES) {
    const root = document.getElementById(`${matrix.group}-matrix`);
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
        const lab = document.createElement("label");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = `${matrix.group}.${row.key}`;
        input.value = opt;
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(` ${opt}`));
        options.appendChild(lab);
      }

      rowEl.appendChild(options);
      root.appendChild(rowEl);
    }
  }
}

function radioValue(name: string): string | undefined {
  return form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value;
}

function textValue(id: string): string {
  return (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value.trim();
}

function setStatus(message: string, kind: "error" | "ok" | "info") {
  const box = document.getElementById("form-status")!;
  box.hidden = !message;
  box.textContent = message;
  box.className = "form-status";
  if (kind === "error") box.classList.add("form-status--error");
  if (kind === "ok") box.classList.add("form-status--ok");
}

function activitatsVisible(): boolean {
  return PARTICIPACIO_AMB_ACTIVITATS.includes(radioValue("participacio") ?? "");
}

function collectPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    collectiu: radioValue("collectiu"),
    email: textValue("email"),
    privacyConsent: (document.getElementById("privacyConsent") as HTMLInputElement).checked,
  };
  const participacio = radioValue("participacio");
  if (participacio) payload.participacio = participacio;

  const skipActivitats = !activitatsVisible();
  for (const m of MATRICES) {
    if (skipActivitats && m.group === ACTIVITATS_GROUP) continue;
    const map: Record<string, string> = {};
    for (const row of m.rows) {
      const v = radioValue(`${m.group}.${row.key}`);
      if (v) map[row.key] = v;
    }
    if (Object.keys(map).length) payload[m.group] = map;
  }
  for (const id of TEXT_FIELDS) {
    if (skipActivitats && id === ACTIVITATS_TEXT) continue;
    const v = textValue(id);
    if (v) payload[id] = v;
  }
  return payload;
}

/* ---------- Draft persistence ---------- */

function saveDraft() {
  const draft: Record<string, string | boolean> = {};
  for (const el of form.elements) {
    if (el instanceof HTMLInputElement) {
      if (el.type === "radio") {
        if (el.checked) draft[el.name] = el.value;
      } else if (el.type === "checkbox") {
        draft[el.name] = el.checked;
      } else if (el.value) {
        draft[el.name] = el.value;
      }
    } else if (el instanceof HTMLTextAreaElement && el.value) {
      draft[el.name] = el.value;
    }
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restoreDraft() {
  let draft: Record<string, string | boolean>;
  try {
    draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}");
  } catch {
    return;
  }
  for (const el of form.elements) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) continue;
    const v = draft[el.name];
    if (v === undefined) continue;
    if (el instanceof HTMLInputElement && el.type === "radio") el.checked = el.value === v;
    else if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = v === true;
    else el.value = String(v);
  }
}

/* ---------- Progress + conditional section ---------- */

function refresh() {
  activitatsBlock.hidden = !activitatsVisible();

  const questions: boolean[] = [
    !!radioValue("collectiu"),
    !!textValue("email"),
    !!radioValue("participacio"),
  ];
  for (const m of MATRICES) {
    if (m.group === ACTIVITATS_GROUP && activitatsBlock.hidden) continue;
    for (const row of m.rows) questions.push(!!radioValue(`${m.group}.${row.key}`));
  }
  const done = questions.filter(Boolean).length;
  (document.getElementById("progress-bar") as HTMLElement).style.width =
    `${Math.round((done / questions.length) * 100)}%`;
}

/* ---------- Access code + status ---------- */

function readAccessCode(): string {
  const fromUrl = new URL(location.href).searchParams.get("c")?.trim();
  if (fromUrl) {
    localStorage.setItem(CODE_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(CODE_KEY) ?? "";
}

function lockForm(message: string) {
  form.classList.add("is-closed");
  form.setAttribute("aria-disabled", "true");
  for (const el of form.elements) {
    (el as HTMLInputElement).disabled = true;
  }
  const banner = document.getElementById("status-banner")!;
  banner.hidden = false;
  document.getElementById("status-message")!.textContent = message;
}

const accessCode = readAccessCode();
let turnstileSiteKey = "";

async function loadStatus() {
  try {
    const res = await fetch(`/api/status?c=${encodeURIComponent(accessCode)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      open?: boolean;
      codeValid?: boolean;
      turnstileSiteKey?: string;
    };
    turnstileSiteKey = data.turnstileSiteKey ?? "";
    if (data.open === false) {
      lockForm("L’enquesta està tancada. Ja no s’accepten més respostes. Gràcies!");
    } else if (data.codeValid === false) {
      lockForm(
        "Per respondre l’enquesta cal obrir l’enllaç que us ha enviat l’organització de la Fira.",
      );
    }
  } catch {
    // Local preview without worker: keep form usable.
  }
}

/* ---------- Turnstile ---------- */

let widgetId: string | undefined;
let pendingToken: ((token: string) => void) | undefined;
let pendingError: ((err: Error) => void) | undefined;

async function getTurnstileToken(): Promise<string> {
  for (let i = 0; !window.turnstile && i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  const ts = window.turnstile;
  if (!ts || !turnstileSiteKey) throw new Error("turnstile_unavailable");

  const token = new Promise<string>((resolve, reject) => {
    pendingToken = resolve;
    pendingError = reject;
  });
  if (widgetId === undefined) {
    widgetId = ts.render(document.getElementById("turnstile")!, {
      sitekey: turnstileSiteKey,
      execution: "execute",
      appearance: "interaction-only",
      callback: (t: string) => pendingToken?.(t),
      "error-callback": () => pendingError?.(new Error("turnstile_error")),
    });
  } else {
    ts.reset(widgetId);
  }
  ts.execute(widgetId);
  return token;
}

/* ---------- Submit ---------- */

async function onSubmit(event: Event) {
  event.preventDefault();

  if (!form.reportValidity()) {
    setStatus("Reviseu els camps obligatoris abans d’enviar.", "error");
    return;
  }

  setStatus("S’està enviant la valoració…", "info");
  submitBtn.disabled = true;

  let turnstileToken: string;
  try {
    turnstileToken = await getTurnstileToken();
  } catch {
    setStatus(
      "No s’ha pogut carregar la verificació antispam. Recarregueu la pàgina i torneu-ho a provar.",
      "error",
    );
    submitBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...collectPayload(), accessCode, turnstileToken }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (res.status === 403) {
      lockForm(data.error ?? "L’enquesta està tancada. Ja no s’accepten més respostes.");
      setStatus(data.error ?? "L’enquesta està tancada.", "error");
      return;
    }
    if (!res.ok) {
      setStatus(data.error ?? "No s’ha pogut enviar. Torneu-ho a provar.", "error");
      submitBtn.disabled = false;
      return;
    }

    localStorage.removeItem(DRAFT_KEY);
    form.hidden = true;
    document.getElementById("progress")!.hidden = true;
    const thanks = document.getElementById("thanks")!;
    thanks.hidden = false;
    thanks.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    setStatus("Error de connexió. Comproveu la xarxa i torneu-ho a provar.", "error");
    submitBtn.disabled = false;
  }
}

renderMatrices();
restoreDraft();
refresh();
void loadStatus();
form.addEventListener("input", () => {
  saveDraft();
  refresh();
});
form.addEventListener("change", () => {
  saveDraft();
  refresh();
});
form.addEventListener("submit", onSubmit);
