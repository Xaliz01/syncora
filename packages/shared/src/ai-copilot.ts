import { normalizeFieldReportText } from "./field-report-text";
import type { PermissionCode } from "./permissions";
import { TVA_RATES, type TvaRate } from "./quote";
import { MAX_COMMENT_BODY_LENGTH } from "./comment";

export const COPILOT_ACTION_TYPES = [
  "field_report",
  "customer_upsert",
  "quote_draft",
  "case_note",
  "schedule_follow_up",
  "unsupported",
] as const;
export type CopilotActionType = (typeof COPILOT_ACTION_TYPES)[number];

export const COPILOT_ACTION_LABELS: Record<CopilotActionType, string> = {
  field_report: "Compte-rendu",
  customer_upsert: "Client",
  quote_draft: "Devis brouillon",
  case_note: "Note",
  schedule_follow_up: "Rendez-vous",
  unsupported: "Non pris en charge",
};

export type CopilotActionStatus = "proposed" | "needs_input" | "confirmed" | "rejected";
export type CopilotSessionStatus = "pending" | "confirmed" | "rejected" | "llm_unavailable";
export type CopilotDecision = "confirmed" | "edited" | "rejected";

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MAX_TRANSCRIPT = 8000;
const MAX_AUDIO_BASE64 = 2_000_000;
const AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
]);

export interface CopilotFieldReportPayload {
  interventionId?: string;
  reportText: string;
}

export interface CopilotCustomerPayload {
  mode: "create" | "update";
  customerId?: string;
  kind: "individual" | "company";
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  notes?: string;
}

export interface CopilotQuoteLinePayload {
  description: string;
  quantity: number;
  /** null tant que la personne n'a pas saisi un prix. Le modèle ne le fixe pas. */
  unitPrice: number | null;
  tvaRate: TvaRate;
}

export interface CopilotQuotePayload {
  customerId?: string;
  customerName?: string;
  caseId?: string;
  createCase: boolean;
  subject: string;
  notes?: string;
  lines: CopilotQuoteLinePayload[];
}

export interface CopilotNotePayload {
  entityType: "case" | "intervention";
  entityId?: string;
  body: string;
}

export interface CopilotFollowUpPayload {
  caseId?: string;
  title: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
}

export interface CopilotActionResult {
  entityType: "intervention" | "customer" | "quote" | "case" | "comment";
  entityId: string;
  caseId?: string;
  label: string;
  href?: string;
}

export interface CopilotProposedAction {
  id: string;
  type: CopilotActionType;
  summary: string;
  status: CopilotActionStatus;
  blockReason?: string;
  fieldReport?: CopilotFieldReportPayload;
  customer?: CopilotCustomerPayload;
  quote?: CopilotQuotePayload;
  note?: CopilotNotePayload;
  followUp?: CopilotFollowUpPayload;
  result?: CopilotActionResult;
}

export interface CopilotSessionResponse {
  id: string;
  organizationId: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt?: string;
  transcript: string;
  audioAvailable: boolean;
  intent: string;
  status: CopilotSessionStatus;
  decision: CopilotDecision | null;
  message?: string;
  actions: CopilotProposedAction[];
  quotaRemaining?: number;
  approxTokens?: number;
}

export interface CopilotSessionListResponse {
  sessions: CopilotSessionResponse[];
  total: number;
}

export interface CopilotPageContext {
  pathname?: string;
  interventionId?: string;
  caseId?: string;
  customerId?: string;
}

export interface CopilotCreateSessionBody {
  transcript: string;
  audioBase64?: string;
  audioMimeType?: string;
  context?: CopilotPageContext;
}

export interface CopilotActionEdit {
  id: string;
  fieldReport?: CopilotFieldReportPayload;
  customer?: CopilotCustomerPayload;
  quote?: CopilotQuotePayload;
  note?: CopilotNotePayload;
  followUp?: CopilotFollowUpPayload;
}

export interface CopilotDecideBody {
  decision: "confirm" | "reject";
  actions?: CopilotActionEdit[];
}

export interface CopilotAllowedIds {
  interventionIds: readonly string[];
  caseIds: readonly string[];
  customerIds: readonly string[];
}

export function copilotContextFromPathname(pathname: string): CopilotPageContext {
  const path = (pathname.split("?")[0] ?? "").slice(0, 200);
  const caseMatch = path.match(/^\/cases\/([a-f0-9]{24})$/i);
  const customerMatch = path.match(/^\/customers\/([a-f0-9]{24})$/i);
  return {
    pathname: path.startsWith("/") ? path : undefined,
    caseId: caseMatch?.[1],
    customerId: customerMatch?.[1],
  };
}

export function copilotCustomerLabel(customer: CopilotCustomerPayload): string {
  if (customer.kind === "company") return customer.companyName?.trim() || "Client";
  const person = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return person || "Client";
}

export function copilotActionRequiredPermissions(action: CopilotProposedAction): PermissionCode[] {
  switch (action.type) {
    case "field_report":
      return ["ai.field_report", "interventions.update"];
    case "customer_upsert":
      return action.customer?.mode === "update" ? ["customers.update"] : ["customers.create"];
    case "quote_draft": {
      const perms: PermissionCode[] = ["quotes.create"];
      if (action.quote?.createCase && !action.quote.caseId) perms.push("cases.create");
      return perms;
    }
    case "case_note":
      return ["comments.create"];
    case "schedule_follow_up":
      return ["interventions.create"];
    default:
      return [];
  }
}

export function applyCopilotPermissionGates(
  actions: CopilotProposedAction[],
  hasPermission: (code: PermissionCode) => boolean,
): CopilotProposedAction[] {
  return actions.map((action) => {
    if (action.type === "unsupported" || action.status === "needs_input") return action;
    const missing = copilotActionRequiredPermissions(action).filter((code) => !hasPermission(code));
    if (missing.length === 0) return action;
    return {
      ...action,
      status: "needs_input",
      blockReason: "Vous n'avez pas le droit d'enregistrer cette action.",
    };
  });
}

function asText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function asId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return OBJECT_ID.test(trimmed) ? trimmed : undefined;
}

function allowedId(value: unknown, allowed: readonly string[]): string | undefined {
  const id = asId(value);
  if (!id) return undefined;
  return allowed.some((item) => item.toLowerCase() === id.toLowerCase()) ? id : undefined;
}

function asTva(value: unknown): TvaRate {
  const num = typeof value === "number" ? value : Number(value);
  return (TVA_RATES as readonly number[]).includes(num) ? (num as TvaRate) : 20;
}

function unsupported(id: string, summary: string): CopilotProposedAction {
  return {
    id,
    type: "unsupported",
    summary,
    status: "needs_input",
    blockReason: summary,
  };
}

function parseLines(raw: unknown, trustPrices: boolean): CopilotQuoteLinePayload[] {
  if (!Array.isArray(raw)) return [];
  const lines: CopilotQuoteLinePayload[] = [];
  for (const item of raw.slice(0, 30)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const description = asText(rec.description ?? rec.label ?? rec.libelle, 300);
    if (!description) continue;
    const qtyRaw = Number(rec.quantity);
    const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.min(qtyRaw, 9999) : 1;
    let unitPrice: number | null = null;
    if (trustPrices && rec.unitPrice != null && rec.unitPrice !== "") {
      const price = Number(rec.unitPrice);
      if (Number.isFinite(price) && price >= 0 && price <= 1_000_000) {
        unitPrice = Math.round(price * 100) / 100;
      }
    }
    lines.push({ description, quantity, unitPrice, tvaRate: asTva(rec.tvaRate) });
  }
  return lines;
}

function assessFieldReport(
  action: CopilotProposedAction,
  allowed: CopilotAllowedIds,
): CopilotProposedAction {
  const report = action.fieldReport;
  const reportText = normalizeFieldReportText(report?.reportText).slice(0, 8000);
  let interventionId = allowedId(report?.interventionId, allowed.interventionIds);
  if (!interventionId && allowed.interventionIds.length === 1) {
    interventionId = allowed.interventionIds[0];
  }
  const next: CopilotProposedAction = {
    ...action,
    fieldReport: { reportText, interventionId },
  };
  if (reportText.trim().length < 8) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Le compte-rendu est trop court pour être enregistré.",
    };
  }
  if (!interventionId) {
    return {
      ...next,
      status: "needs_input",
      blockReason:
        "Ouvrez l'intervention (ou le dossier qui n'en contient qu'une), puis répétez l'instruction pour enregistrer le compte-rendu.",
    };
  }
  return { ...next, status: "proposed", blockReason: undefined };
}

function assessCustomer(action: CopilotProposedAction): CopilotProposedAction {
  const customer = action.customer;
  if (!customer) {
    return {
      ...action,
      status: "needs_input",
      blockReason: "Les informations du client sont incomplètes.",
    };
  }
  const nextCustomer: CopilotCustomerPayload = {
    ...customer,
    customerId: asId(customer.customerId),
    firstName: asText(customer.firstName, 80) || undefined,
    lastName: asText(customer.lastName, 80) || undefined,
    companyName: asText(customer.companyName, 160) || undefined,
    email: asText(customer.email, 160) || undefined,
    phone: asText(customer.phone, 40) || undefined,
    addressLine1: asText(customer.addressLine1, 200) || undefined,
    postalCode: asText(customer.postalCode, 12) || undefined,
    city: asText(customer.city, 80) || undefined,
    notes: asText(customer.notes, 2000) || undefined,
  };
  const addressParts = [nextCustomer.addressLine1, nextCustomer.postalCode, nextCustomer.city];
  const addressCount = addressParts.filter(Boolean).length;
  if (addressCount > 0 && addressCount < 3) {
    const raw = addressParts.filter(Boolean).join(", ");
    nextCustomer.notes = [nextCustomer.notes, `Adresse dictée : ${raw}`].filter(Boolean).join("\n");
    nextCustomer.addressLine1 = undefined;
    nextCustomer.postalCode = undefined;
    nextCustomer.city = undefined;
  }
  const next = { ...action, customer: nextCustomer };
  if (nextCustomer.mode === "update" && !nextCustomer.customerId) {
    return {
      ...next,
      status: "needs_input",
      blockReason:
        "Ouvrez la fiche du client à modifier, ou dites son nom exact s'il n'y en a qu'un.",
    };
  }
  if (nextCustomer.kind === "company" && !nextCustomer.companyName) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Indiquez la raison sociale du client.",
    };
  }
  if (
    nextCustomer.kind === "individual" &&
    !nextCustomer.firstName &&
    !nextCustomer.lastName &&
    !nextCustomer.companyName
  ) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Indiquez le nom du client.",
    };
  }
  if (nextCustomer.kind === "individual" && !nextCustomer.firstName && !nextCustomer.lastName) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Indiquez le prénom ou le nom du client.",
    };
  }
  return { ...next, status: "proposed", blockReason: undefined };
}

function assessQuote(
  action: CopilotProposedAction,
  allowed: CopilotAllowedIds,
): CopilotProposedAction {
  const quote = action.quote;
  const lines = quote?.lines ?? [];
  const caseId = allowedId(quote?.caseId, allowed.caseIds);
  const customerId = allowedId(quote?.customerId, allowed.customerIds);
  const nextQuote: CopilotQuotePayload = {
    customerId,
    customerName: asText(quote?.customerName, 160) || undefined,
    caseId,
    createCase: !caseId,
    subject: asText(quote?.subject, 200) || "Devis",
    notes: asText(quote?.notes, 2000) || undefined,
    lines,
  };
  const next = { ...action, quote: nextQuote };
  if (lines.length === 0) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Aucune ligne de devis n'a été reconnue. Précisez les travaux.",
    };
  }
  if (!caseId && !customerId && !nextQuote.customerName) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Indiquez le client, ou ouvrez son dossier, pour préparer le devis.",
    };
  }
  return { ...next, status: "proposed", blockReason: undefined };
}

function assessNote(
  action: CopilotProposedAction,
  allowed: CopilotAllowedIds,
): CopilotProposedAction {
  const note = action.note;
  const entityType: "case" | "intervention" =
    note?.entityType === "intervention" ? "intervention" : "case";
  const pool = entityType === "intervention" ? allowed.interventionIds : allowed.caseIds;
  let entityId = allowedId(note?.entityId, pool);
  if (!entityId && pool.length === 1) entityId = pool[0];
  const body = asText(note?.body, MAX_COMMENT_BODY_LENGTH);
  const next: CopilotProposedAction = { ...action, note: { entityType, entityId, body } };
  if (!body) {
    return { ...next, status: "needs_input", blockReason: "La note est vide." };
  }
  if (!entityId) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Ouvrez le dossier ou l'intervention où enregistrer la note.",
    };
  }
  return { ...next, status: "proposed", blockReason: undefined };
}

function assessFollowUp(
  action: CopilotProposedAction,
  allowed: CopilotAllowedIds,
): CopilotProposedAction {
  const follow = action.followUp;
  let caseId = allowedId(follow?.caseId, allowed.caseIds);
  if (!caseId && allowed.caseIds.length === 1) caseId = allowed.caseIds[0];
  const title = asText(follow?.title, 200);
  const startRaw = asText(follow?.scheduledStart, 40);
  const start = startRaw && !Number.isNaN(Date.parse(startRaw)) ? new Date(startRaw) : null;
  let scheduledEnd = asText(follow?.scheduledEnd, 40) || undefined;
  if (start && (!scheduledEnd || Number.isNaN(Date.parse(scheduledEnd)))) {
    scheduledEnd = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
  }
  const next = {
    ...action,
    followUp: {
      caseId,
      title: title || "Relance",
      scheduledStart: start ? start.toISOString() : undefined,
      scheduledEnd,
      notes: asText(follow?.notes, 2000) || undefined,
    },
  };
  if (!start) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "La date du rendez-vous n'est pas assez précise.",
    };
  }
  if (!caseId) {
    return {
      ...next,
      status: "needs_input",
      blockReason: "Ouvrez le dossier dans lequel planifier le rendez-vous.",
    };
  }
  return { ...next, status: "proposed", blockReason: undefined };
}

export function assessCopilotAction(
  action: CopilotProposedAction,
  allowed: CopilotAllowedIds,
): CopilotProposedAction {
  switch (action.type) {
    case "field_report":
      return assessFieldReport(action, allowed);
    case "customer_upsert":
      return assessCustomer(action);
    case "quote_draft":
      return assessQuote(action, allowed);
    case "case_note":
      return assessNote(action, allowed);
    case "schedule_follow_up":
      return assessFollowUp(action, allowed);
    default:
      return {
        ...action,
        type: "unsupported",
        status: "needs_input",
        blockReason: action.summary || "Cette instruction ne correspond à aucune action du CRM.",
      };
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function actionFromModel(
  raw: Record<string, unknown>,
  id: string,
  allowed: CopilotAllowedIds,
): CopilotProposedAction {
  const typeRaw = asText(raw.type, 40);
  const summary = asText(raw.summary, 400) || "Action proposée";
  const base: CopilotProposedAction = {
    id,
    type: (COPILOT_ACTION_TYPES as readonly string[]).includes(typeRaw)
      ? (typeRaw as CopilotActionType)
      : "unsupported",
    summary,
    status: "proposed",
  };
  if (base.type === "field_report") {
    const payload = readRecord(raw.fieldReport) ?? raw;
    base.fieldReport = {
      interventionId: asText(payload.interventionId, 40) || undefined,
      reportText: asText(payload.reportText ?? payload.report ?? payload.texte, 8000),
    };
  } else if (base.type === "customer_upsert") {
    const payload = readRecord(raw.customer) ?? raw;
    const kind = payload.kind === "company" ? "company" : "individual";
    base.customer = {
      mode: payload.mode === "update" ? "update" : "create",
      customerId: asText(payload.customerId, 40) || undefined,
      kind,
      firstName: asText(payload.firstName, 80) || undefined,
      lastName: asText(payload.lastName, 80) || undefined,
      companyName: asText(payload.companyName, 160) || undefined,
      email: asText(payload.email, 160) || undefined,
      phone: asText(payload.phone, 40) || undefined,
      addressLine1: asText(payload.addressLine1 ?? payload.address, 200) || undefined,
      postalCode: asText(payload.postalCode, 12) || undefined,
      city: asText(payload.city, 80) || undefined,
      notes: asText(payload.notes, 2000) || undefined,
    };
  } else if (base.type === "quote_draft") {
    const payload = readRecord(raw.quote) ?? raw;
    base.quote = {
      customerId: asText(payload.customerId, 40) || undefined,
      customerName: asText(payload.customerName, 160) || undefined,
      caseId: asText(payload.caseId, 40) || undefined,
      createCase: true,
      subject: asText(payload.subject, 200) || "Devis",
      notes: asText(payload.notes, 2000) || undefined,
      lines: parseLines(payload.lines, false),
    };
  } else if (base.type === "case_note") {
    const payload = readRecord(raw.note) ?? raw;
    base.note = {
      entityType: payload.entityType === "intervention" ? "intervention" : "case",
      entityId: asText(payload.entityId, 40) || undefined,
      body: asText(payload.body, MAX_COMMENT_BODY_LENGTH),
    };
  } else if (base.type === "schedule_follow_up") {
    const payload = readRecord(raw.followUp) ?? raw;
    base.followUp = {
      caseId: asText(payload.caseId, 40) || undefined,
      title: asText(payload.title, 200),
      scheduledStart: asText(payload.scheduledStart, 40) || undefined,
      scheduledEnd: asText(payload.scheduledEnd, 40) || undefined,
      notes: asText(payload.notes, 2000) || undefined,
    };
  } else {
    return unsupported(id, summary || "Cette instruction ne correspond à aucune action du CRM.");
  }
  return assessCopilotAction(base, allowed);
}

export function parseCopilotModelOutput(
  raw: string,
  allowed: CopilotAllowedIds = { interventionIds: [], caseIds: [], customerIds: [] },
): { intent: string; actions: CopilotProposedAction[] } {
  const fallback = {
    intent: "Instruction non comprise",
    actions: [
      unsupported(
        "a1",
        "Je n'ai pas compris cette instruction. Reformulez-la en précisant le client, le dossier ou l'intervention.",
      ),
    ],
  };
  let parsed: unknown;
  try {
    const unfenced = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(unfenced);
  } catch {
    return fallback;
  }
  const record = readRecord(parsed);
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(record?.actions)
      ? record.actions
      : null;
  if (!list) return fallback;
  const intent = asText(record?.intent, 200) || "Instruction vocale";
  const actions = list
    .slice(0, 8)
    .map((item, index) => {
      const rec = readRecord(item);
      if (!rec) return unsupported(`a${index + 1}`, "Action illisible.");
      return actionFromModel(rec, `a${index + 1}`, allowed);
    })
    .filter((action) => action.summary || action.type);
  if (actions.length === 0) {
    return {
      intent,
      actions: [
        unsupported(
          "a1",
          "Je n'ai reconnu aucune action à enregistrer. Précisez ce qu'il faut créer ou noter.",
        ),
      ],
    };
  }
  return { intent, actions };
}

function mergeEdit(action: CopilotProposedAction, edit: CopilotActionEdit): CopilotProposedAction {
  if (action.type === "field_report" && edit.fieldReport) {
    return {
      ...action,
      fieldReport: {
        interventionId: action.fieldReport?.interventionId,
        reportText: asText(edit.fieldReport.reportText, 8000),
      },
    };
  }
  if (action.type === "customer_upsert" && edit.customer) {
    return {
      ...action,
      customer: {
        ...action.customer,
        ...edit.customer,
        mode: action.customer?.mode ?? edit.customer.mode,
        kind: edit.customer.kind || action.customer?.kind || "individual",
      },
    };
  }
  if (action.type === "quote_draft" && edit.quote) {
    return {
      ...action,
      quote: {
        customerId: action.quote?.customerId,
        customerName:
          asText(edit.quote.customerName ?? action.quote?.customerName, 160) || undefined,
        caseId: action.quote?.caseId,
        createCase: action.quote?.createCase ?? !action.quote?.caseId,
        subject: asText(edit.quote.subject, 200) || action.quote?.subject || "Devis",
        notes: asText(edit.quote.notes ?? "", 2000) || undefined,
        lines: parseLines(edit.quote.lines, true),
      },
    };
  }
  if (action.type === "case_note" && edit.note) {
    return {
      ...action,
      note: {
        entityType: action.note?.entityType ?? "case",
        entityId: action.note?.entityId,
        body: asText(edit.note.body, MAX_COMMENT_BODY_LENGTH),
      },
    };
  }
  if (action.type === "schedule_follow_up" && edit.followUp) {
    return {
      ...action,
      followUp: {
        caseId: action.followUp?.caseId,
        title: asText(edit.followUp.title, 200) || action.followUp?.title || "Relance",
        scheduledStart: asText(edit.followUp.scheduledStart, 40) || action.followUp?.scheduledStart,
        scheduledEnd: asText(edit.followUp.scheduledEnd, 40) || action.followUp?.scheduledEnd,
        notes: asText(edit.followUp.notes ?? "", 2000) || undefined,
      },
    };
  }
  return action;
}

export function copilotActionSnapshot(action: CopilotProposedAction): string {
  return JSON.stringify({
    fieldReport: action.fieldReport ?? null,
    customer: action.customer ?? null,
    quote: action.quote ?? null,
    note: action.note ?? null,
    followUp: action.followUp ?? null,
  });
}

export function confirmBlocker(action: CopilotProposedAction): string | null {
  if (action.type === "unsupported") {
    return action.blockReason || "Cette instruction ne peut pas être enregistrée.";
  }
  if (action.blockReason && action.status === "needs_input") return action.blockReason;
  if (action.type === "field_report") {
    if (!action.fieldReport?.interventionId) {
      return "Ouvrez l'intervention pour enregistrer le compte-rendu.";
    }
    if ((action.fieldReport.reportText ?? "").trim().length < 8) {
      return "Le compte-rendu est trop court pour être enregistré.";
    }
  }
  if (action.type === "customer_upsert") {
    const customer = action.customer;
    if (!customer) return "Les informations du client sont incomplètes.";
    if (customer.mode === "update" && !customer.customerId) {
      return "Le client à modifier n'est pas identifié.";
    }
    if (customer.kind === "company" && !customer.companyName?.trim()) {
      return "Indiquez la raison sociale du client.";
    }
    if (
      customer.kind === "individual" &&
      !customer.firstName?.trim() &&
      !customer.lastName?.trim()
    ) {
      return "Indiquez le prénom ou le nom du client.";
    }
  }
  if (action.type === "quote_draft") {
    const quote = action.quote;
    if (!quote || quote.lines.length === 0) return "Le devis n'a aucune ligne.";
    if (!quote.caseId && !quote.customerId && !quote.customerName) {
      return "Indiquez le client du devis.";
    }
    if (quote.lines.some((line) => line.unitPrice == null)) {
      return "Indiquez un prix pour chaque ligne du devis. Le copilote ne fixe pas les montants.";
    }
  }
  if (action.type === "case_note") {
    if (!action.note?.entityId || !action.note.body.trim()) {
      return "La note doit viser un dossier ou une intervention ouvert.";
    }
  }
  if (action.type === "schedule_follow_up") {
    if (!action.followUp?.caseId || !action.followUp.scheduledStart) {
      return "Le rendez-vous a besoin d'un dossier et d'une date.";
    }
    if (Number.isNaN(Date.parse(action.followUp.scheduledStart))) {
      return "La date du rendez-vous n'est pas assez précise.";
    }
  }
  return null;
}

export function planCopilotConfirmation(
  actions: CopilotProposedAction[],
  edits: CopilotActionEdit[],
): { ok: true; actions: CopilotProposedAction[]; edited: boolean } | { ok: false; error: string } {
  if (!edits.length) {
    return {
      ok: false,
      error: "Sélectionnez au moins une action à enregistrer, ou ignorez l'instruction.",
    };
  }
  const byId = new Map(actions.map((action) => [action.id, action]));
  const selected: CopilotProposedAction[] = [];
  let edited = false;
  for (const edit of edits) {
    const current = byId.get(edit.id);
    if (!current)
      return { ok: false, error: "Une action demandée n'appartient pas à cette instruction." };
    if (current.status === "confirmed" || current.status === "rejected") {
      return { ok: false, error: "Cette instruction a déjà été traitée." };
    }
    const merged = mergeEdit(current, edit);
    const blocker = confirmBlocker(merged);
    if (blocker) return { ok: false, error: blocker };
    if (copilotActionSnapshot(merged) !== copilotActionSnapshot(current)) edited = true;
    selected.push({ ...merged, status: "proposed", blockReason: undefined });
  }
  return { ok: true, actions: selected, edited };
}

function mimeOf(value: unknown): string | undefined {
  const raw = asText(value, 80).toLowerCase();
  if (!raw) return undefined;
  const base = raw.split(";")[0]?.trim() ?? "";
  return AUDIO_MIMES.has(base) ? base : undefined;
}

export function parseCopilotCreateBody(
  body: unknown,
): { ok: true; value: CopilotCreateSessionBody } | { ok: false; error: string } {
  const record = readRecord(body);
  if (!record) return { ok: false, error: "Instruction manquante." };
  const transcript = asText(record.transcript, MAX_TRANSCRIPT);
  if (!transcript)
    return { ok: false, error: "Dictez ou écrivez une instruction avant de l'envoyer." };
  const audioBase64 =
    typeof record.audioBase64 === "string" ? record.audioBase64.replace(/\s/g, "") : "";
  let audioMimeType = mimeOf(record.audioMimeType);
  if (audioBase64) {
    if (audioBase64.length > MAX_AUDIO_BASE64) {
      return {
        ok: false,
        error: "L'enregistrement est trop long. Raccourcissez-le ou écrivez l'instruction.",
      };
    }
    if (!/^[A-Za-z0-9+/]+=*$/.test(audioBase64)) {
      return {
        ok: false,
        error: "L'enregistrement audio est illisible. Réessayez ou écrivez l'instruction.",
      };
    }
    audioMimeType = audioMimeType ?? "audio/webm";
  }
  const contextRaw = readRecord(record.context) ?? {};
  const context: CopilotPageContext = {
    pathname: asText(contextRaw.pathname, 200).startsWith("/")
      ? asText(contextRaw.pathname, 200)
      : undefined,
    interventionId: asId(contextRaw.interventionId),
    caseId: asId(contextRaw.caseId),
    customerId: asId(contextRaw.customerId),
  };
  return {
    ok: true,
    value: {
      transcript,
      ...(audioBase64 ? { audioBase64, audioMimeType } : {}),
      context,
    },
  };
}

export function parseCopilotDecideBody(
  body: unknown,
): { ok: true; value: CopilotDecideBody } | { ok: false; error: string } {
  const record = readRecord(body);
  if (!record) return { ok: false, error: "Décision manquante." };
  if (record.decision !== "confirm" && record.decision !== "reject") {
    return { ok: false, error: "Choisissez d'enregistrer ou d'ignorer l'instruction." };
  }
  if (record.decision === "reject") return { ok: true, value: { decision: "reject" } };
  if (!Array.isArray(record.actions)) {
    return {
      ok: false,
      error: "Sélectionnez au moins une action à enregistrer, ou ignorez l'instruction.",
    };
  }
  const actions: CopilotActionEdit[] = [];
  for (const item of record.actions.slice(0, 8)) {
    const rec = readRecord(item);
    const id = asText(rec?.id, 12);
    if (!rec || !id) return { ok: false, error: "Une action à confirmer est illisible." };
    actions.push({
      id,
      fieldReport: readRecord(rec.fieldReport)
        ? {
            reportText: asText(readRecord(rec.fieldReport)?.reportText, 8000),
            interventionId: asId(readRecord(rec.fieldReport)?.interventionId),
          }
        : undefined,
      customer: readRecord(rec.customer) as unknown as CopilotCustomerPayload | undefined,
      quote: readRecord(rec.quote) as unknown as CopilotQuotePayload | undefined,
      note: readRecord(rec.note) as unknown as CopilotNotePayload | undefined,
      followUp: readRecord(rec.followUp) as unknown as CopilotFollowUpPayload | undefined,
    });
  }
  return { ok: true, value: { decision: "confirm", actions } };
}

export const COPILOT_SYSTEM_PROMPT = `Tu es le copilote terrain de Planwise pour un artisan ou une TPE.
À partir de l'instruction (dictée) et des fiches autorisées ci-dessous, propose des actions CRM structurées.
Tu ne crées rien : tu proposes seulement. Un humain confirmera.

Types autorisés : field_report, customer_upsert, quote_draft, case_note, schedule_follow_up, unsupported.
Règles :
- Français, factuel. N'invente aucun fait, prix, identifiant, e-mail ou téléphone absent de l'instruction ou des fiches autorisées.
- Les id doivent être copiés depuis la liste autorisée, ou omis.
- field_report.reportText : compte-rendu (3 à 8 phrases) à partir des notes d'intervention et de la dictée uniquement.
- quote_draft.lines : description et quantity seulement. Jamais de prix.
- Si l'instruction est ambiguë ou hors CRM (facture à envoyer, e-mail au client, stock à sortir), un seul type unsupported avec un summary clair pour l'utilisateur.
- Plusieurs actions sont possibles (ex. créer le client puis un devis).

Réponds uniquement avec un objet JSON :
{"intent":"court","actions":[{"type":"...","summary":"...","fieldReport":{"reportText":"...","interventionId":""},"customer":{"mode":"create","kind":"individual","firstName":"","lastName":"","companyName":"","phone":"","email":""},"quote":{"subject":"","customerName":"","caseId":"","lines":[{"description":"","quantity":1}]},"note":{"entityType":"case","entityId":"","body":""},"followUp":{"caseId":"","title":"","scheduledStart":"ISO-8601","notes":""}}]}`;
