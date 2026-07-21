/** Contrats API intégrations compta / banque (Pennylane, Qonto, etc.) — Phase 3.3 */

import type { BillingStatus } from "./case";

export const INTEGRATION_PROVIDERS = ["pennylane", "qonto"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type PennylaneAuthMethod = "oauth" | "api_token";
export type QontoAuthMethod = "oauth" | "api_token";

/** Type de facture CRM (pont vers l’outil de facturation). */
export const CASE_INVOICE_KINDS = ["full", "situation", "deposit", "balance"] as const;
export type CaseInvoiceKind = (typeof CASE_INVOICE_KINDS)[number];

export const CASE_INVOICE_KIND_LABELS: Record<CaseInvoiceKind, string> = {
  full: "Facture complète",
  situation: "Situation",
  deposit: "Acompte",
  balance: "Solde",
};

export interface PennylaneConnectionStatus {
  provider: "pennylane";
  connected: boolean;
  /** Identifiant entreprise côté Pennylane (si disponible). */
  companyId?: string;
  companyName?: string;
  connectedAt?: string;
  /** Masque du token, ex. "••••abcd" */
  tokenHint?: string;
  /** Mode d’auth utilisé pour la connexion active. */
  authMethod?: PennylaneAuthMethod;
  /**
   * True si la plateforme a configuré Client ID/Secret OAuth
   * (bouton « Connecter avec Pennylane » disponible).
   */
  oauthAvailable?: boolean;
}

export interface ConnectPennylaneBody {
  organizationId: string;
  /** Token API entreprise Pennylane (Company API token) — secours hors OAuth. */
  apiToken: string;
}

export interface DisconnectPennylaneBody {
  organizationId: string;
}

export interface PennylaneOAuthStartResponse {
  authorizationUrl: string;
}

export interface CompletePennylaneOAuthBody {
  organizationId: string;
  /** Authorization code renvoyé par Pennylane. */
  code: string;
  /** State CSRF signé émis au démarrage du flux. */
  state: string;
}

export interface PennylaneInvoiceLinePayload {
  label: string;
  quantity: number;
  /** Prix unitaire HT en euros (string décimale pour Pennylane). */
  unitPriceHt: string;
  /** Code TVA Pennylane, ex. FR_200 */
  vatRate: string;
  unit?: string;
}

export interface PennylaneCustomerPayload {
  /** ID client Planwise (external_reference). */
  planwiseCustomerId: string;
  name: string;
  email?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface SyncCaseToPennylaneBody {
  organizationId: string;
  caseId: string;
  caseTitle: string;
  /** Référence externe unique (idempotence distante / traçabilité). */
  externalReference: string;
  invoiceDate: string;
  deadline?: string;
  customer: PennylaneCustomerPayload;
  lines: PennylaneInvoiceLinePayload[];
  /** Si true, crée une facture brouillon (recommandé). */
  draft?: boolean;
  quoteId?: string;
  invoiceKind?: CaseInvoiceKind;
  situationNumber?: number;
  situationPercent?: number;
  /** Montant HT envoyé (string décimale). */
  amountHt?: string;
}

export interface SyncCaseToPennylaneResult {
  provider: "pennylane";
  caseId: string;
  syncId: string;
  pennylaneCustomerId: string;
  pennylaneInvoiceId: string;
  draft: boolean;
  invoiceUrl?: string;
}

/* ── Qonto (connexion organisation — v1) ─────────────────────── */

export interface QontoConnectionStatus {
  provider: "qonto";
  connected: boolean;
  companyId?: string;
  companyName?: string;
  connectedAt?: string;
  tokenHint?: string;
  authMethod?: QontoAuthMethod;
  /** True si Client ID/Secret OAuth Qonto sont configurés sur la plateforme. */
  oauthAvailable?: boolean;
}

export interface ConnectQontoBody {
  organizationId: string;
  /** Identifiant de connexion Qonto (login / sign-in). */
  login: string;
  /** Clé secrète API Qonto. */
  secretKey: string;
}

export interface DisconnectQontoBody {
  organizationId: string;
}

export interface QontoOAuthStartResponse {
  authorizationUrl: string;
}

export interface CompleteQontoOAuthBody {
  organizationId: string;
  code: string;
  state: string;
}

export interface QontoInvoiceLinePayload {
  label: string;
  quantity: number;
  /** Prix unitaire HT en euros (string décimale). */
  unitPriceHt: string;
  /** Taux TVA décimal Qonto, ex. "0.20" pour 20 %. */
  vatRate: string;
  unit?: string;
}

export interface QontoCustomerPayload {
  planwiseCustomerId: string;
  kind: "individual" | "company";
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** SIREN / SIRET / identifiant fiscal. */
  legalIdentifier?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface SyncCaseToQontoBody {
  organizationId: string;
  caseId: string;
  caseTitle: string;
  externalReference: string;
  invoiceDate: string;
  deadline?: string;
  customer: QontoCustomerPayload;
  lines: QontoInvoiceLinePayload[];
  /** Si true (défaut), crée une facture brouillon. */
  draft?: boolean;
  /**
   * Numéro de facture Qonto.
   * Omit pour laisser Qonto auto-numéroter ; requis si la numérotation auto est désactivée.
   */
  invoiceNumber?: string;
  quoteId?: string;
  invoiceKind?: CaseInvoiceKind;
  situationNumber?: number;
  situationPercent?: number;
  amountHt?: string;
}

/** Message renvoyé quand Qonto exige un numéro de facture (numérotation auto absente). */
export const QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE =
  "La numérotation automatique des factures n’est pas activée sur Qonto. Activez-la dans Qonto → Facturation → Paramètres → Numérotation, ou saisissez un numéro de facture manuellement.";

export interface SyncCaseToQontoResult {
  provider: "qonto";
  caseId: string;
  syncId: string;
  qontoCustomerId: string;
  qontoInvoiceId: string;
  draft: boolean;
  invoiceUrl?: string;
}

/** Options gateway / UI pour créer une facture (toujours liée à un devis). */
export interface SyncCaseInvoiceOptions {
  /** Devis source — obligatoire. */
  quoteId: string;
  invoiceNumber?: string;
  invoiceKind?: CaseInvoiceKind;
  /** Pour une situation : pourcentage du devis (1–100). */
  situationPercent?: number;
  /** Pour situation / acompte : montant HT fixe. */
  amountHt?: number;
}

/** Cycle de vie distant d’une facture (Pennylane / Qonto), normalisé pour le CRM. */
export type RemoteInvoiceLifecycle = "draft" | "finalized" | "paid" | "cancelled" | "unknown";

export interface CaseInvoiceSyncStatus {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  caseId: string;
  quoteId?: string;
  invoiceKind: CaseInvoiceKind;
  situationNumber?: number;
  situationPercent?: number;
  /** Montant HT de cette facture (string décimale). */
  amountHt?: string;
  remoteInvoiceId: string;
  remoteCustomerId: string;
  draft: boolean;
  remoteStatus: RemoteInvoiceLifecycle;
  invoiceUrl?: string;
  invoiceNumber?: string;
  lastSyncedAt?: string;
  createdAt?: string;
}

export interface CaseInvoiceSyncListResponse {
  invoices: CaseInvoiceSyncStatus[];
}

export function billingStatusFromRemoteInvoice(
  remote: RemoteInvoiceLifecycle,
): "invoice_draft" | "invoiced" | "paid" | null {
  switch (remote) {
    case "draft":
      return "invoice_draft";
    case "finalized":
      return "invoiced";
    case "paid":
      return "paid";
    default:
      return null;
  }
}

/**
 * Agrège le statut CRM à partir des factures liées au dossier.
 * `quoteTotalHt` = total HT du/des devis de référence (0 si inconnu → pas de « partiel » par reste).
 */
export function aggregateCaseBillingStatus(
  invoices: Array<{
    remoteStatus: RemoteInvoiceLifecycle;
    amountHt?: string;
    invoiceKind?: CaseInvoiceKind;
  }>,
  quoteTotalHt = 0,
): BillingStatus | null {
  const active = invoices.filter((i) => i.remoteStatus !== "cancelled");
  if (active.length === 0) return null;

  const invoicedHt = sumInvoiceAmountsHt(
    active.filter((i) => i.remoteStatus === "finalized" || i.remoteStatus === "paid"),
  );
  const remainingHt = Math.max(0, round2(quoteTotalHt - invoicedHt));
  const hasRemaining = quoteTotalHt > 0.009 && remainingHt > 0.009;
  const anyDraft = active.some((i) => i.remoteStatus === "draft");
  const anyFinalOrPaid = active.some(
    (i) => i.remoteStatus === "finalized" || i.remoteStatus === "paid",
  );
  const allPaid = active.every((i) => i.remoteStatus === "paid");
  const allFinalOrPaid = active.every(
    (i) => i.remoteStatus === "finalized" || i.remoteStatus === "paid",
  );

  if (allPaid && !hasRemaining) return "paid";
  if (hasRemaining && anyFinalOrPaid) return "partially_invoiced";
  if (allFinalOrPaid && !hasRemaining) return "invoiced";
  if (anyDraft && !anyFinalOrPaid) return "invoice_draft";
  if (anyDraft && anyFinalOrPaid) return hasRemaining ? "partially_invoiced" : "invoice_draft";
  if (anyFinalOrPaid) return hasRemaining ? "partially_invoiced" : "invoiced";
  return "invoice_draft";
}

export function sumInvoiceAmountsHt(
  invoices: Array<{ amountHt?: string; remoteStatus?: RemoteInvoiceLifecycle }>,
): number {
  return round2(
    invoices.reduce((sum, inv) => {
      if (inv.remoteStatus === "cancelled") return sum;
      const n = Number.parseFloat(inv.amountHt ?? "0");
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0),
  );
}

/** Montants déjà engagés (brouillon + validé + payé) pour un devis. */
export function quoteInvoicedHt(
  invoices: Array<{
    quoteId?: string;
    amountHt?: string;
    remoteStatus?: RemoteInvoiceLifecycle;
  }>,
  quoteId: string,
): number {
  return sumInvoiceAmountsHt(
    invoices.filter(
      (i) =>
        i.quoteId === quoteId &&
        (i.remoteStatus === "finalized" || i.remoteStatus === "paid" || i.remoteStatus === "draft"),
    ),
  );
}

export function remainingQuoteHt(quoteTotalHt: number, alreadyInvoicedHt: number): number {
  return round2(Math.max(0, quoteTotalHt - alreadyInvoicedHt));
}

export function remainingQuotePercent(quoteTotalHt: number, remainingHt: number): number {
  if (quoteTotalHt <= 0) return 0;
  return round2((remainingHt / quoteTotalHt) * 100);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Prochaine situation (1, 2, …) pour un devis donné. */
export function nextSituationNumber(
  invoices: Array<{
    quoteId?: string;
    invoiceKind?: CaseInvoiceKind;
    situationNumber?: number;
    remoteStatus?: RemoteInvoiceLifecycle;
  }>,
  quoteId: string,
): number {
  const nums = invoices
    .filter(
      (i) =>
        i.quoteId === quoteId &&
        i.invoiceKind === "situation" &&
        i.remoteStatus !== "cancelled" &&
        typeof i.situationNumber === "number",
    )
    .map((i) => i.situationNumber!);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export interface QuoteLineForInvoice {
  label: string;
  quantity: number;
  unitPriceHt: string;
  tvaRate: 0 | 5.5 | 10 | 20;
  unit?: string;
}

/**
 * Construit les lignes + montant HT selon le type de facture (complète / situation / acompte / solde).
 */
export function buildInvoiceLinesFromQuote(input: {
  caseTitle: string;
  quoteSubject?: string;
  quoteTotalHt: number;
  quoteLines: QuoteLineForInvoice[];
  invoiceKind: CaseInvoiceKind;
  situationPercent?: number;
  amountHt?: number;
  alreadyInvoicedHt: number;
  situationNumber?: number;
}): { lines: QuoteLineForInvoice[]; amountHt: string; situationPercent?: number } {
  const { invoiceKind, quoteTotalHt, quoteLines, caseTitle, alreadyInvoicedHt } = input;
  const remaining = round2(Math.max(0, quoteTotalHt - alreadyInvoicedHt));

  if (invoiceKind === "full") {
    if (alreadyInvoicedHt > 0.009) {
      throw new Error(
        `Une facture complète n’est plus possible : ${alreadyInvoicedHt.toFixed(2)} € HT sont déjà facturés ou en brouillon sur ce devis. Utilisez une situation, un acompte ou un solde.`,
      );
    }
    const lines =
      quoteLines.length > 0
        ? quoteLines
        : [{ label: caseTitle, quantity: 1, unitPriceHt: "0.00", tvaRate: 20 as const }];
    const amount = quoteLines.length
      ? round2(
          quoteLines.reduce((s, l) => s + l.quantity * Number.parseFloat(l.unitPriceHt || "0"), 0),
        )
      : quoteTotalHt;
    return { lines, amountHt: amount.toFixed(2) };
  }

  if (invoiceKind === "balance") {
    if (remaining <= 0.009) {
      throw new Error("Aucune somme restante à facturer sur ce devis.");
    }
    return {
      lines: [
        {
          label: `Solde — ${input.quoteSubject || caseTitle}`.slice(0, 200),
          quantity: 1,
          unitPriceHt: remaining.toFixed(2),
          tvaRate: dominantTva(quoteLines),
        },
      ],
      amountHt: remaining.toFixed(2),
    };
  }

  if (invoiceKind === "deposit") {
    const amount = round2(input.amountHt ?? 0);
    if (amount <= 0) {
      throw new Error("Indiquez un montant HT d’acompte.");
    }
    assertAmountWithinRemaining(amount, remaining, quoteTotalHt, "L’acompte");
    return {
      lines: [
        {
          label: `Acompte — ${input.quoteSubject || caseTitle}`.slice(0, 200),
          quantity: 1,
          unitPriceHt: amount.toFixed(2),
          tvaRate: dominantTva(quoteLines),
        },
      ],
      amountHt: amount.toFixed(2),
    };
  }

  // situation
  const percent = input.situationPercent;
  const fixedAmount = input.amountHt;
  let amount: number;
  let situationPercent: number | undefined;

  if (percent != null && Number.isFinite(percent)) {
    if (percent <= 0 || percent > 100) {
      throw new Error("Le pourcentage de situation doit être compris entre 1 et 100.");
    }
    amount = round2((quoteTotalHt * percent) / 100);
    situationPercent = percent;
  } else if (fixedAmount != null && Number.isFinite(fixedAmount)) {
    amount = round2(fixedAmount);
  } else {
    throw new Error("Indiquez un pourcentage ou un montant HT pour la situation.");
  }

  if (amount <= 0) {
    throw new Error("Le montant de la situation doit être positif.");
  }
  assertAmountWithinRemaining(amount, remaining, quoteTotalHt, "La situation");

  const n = input.situationNumber ?? 1;
  if (situationPercent != null && quoteLines.length > 0) {
    const factor = situationPercent / 100;
    return {
      lines: quoteLines.map((l) => ({
        ...l,
        quantity: round2(l.quantity * factor),
      })),
      amountHt: amount.toFixed(2),
      situationPercent,
    };
  }

  return {
    lines: [
      {
        label: `Situation ${n} — ${input.quoteSubject || caseTitle}`.slice(0, 200),
        quantity: 1,
        unitPriceHt: amount.toFixed(2),
        tvaRate: dominantTva(quoteLines),
      },
    ],
    amountHt: amount.toFixed(2),
    situationPercent,
  };
}

function assertAmountWithinRemaining(
  amount: number,
  remaining: number,
  quoteTotalHt: number,
  label: string,
): void {
  if (quoteTotalHt <= 0) return;
  if (amount <= remaining + 0.009) return;
  const remainingPct = round2((remaining / quoteTotalHt) * 100);
  throw new Error(
    `${label} dépasse le reste à facturer (${remainingPct} % · ${remaining.toFixed(2)} € HT).`,
  );
}

function dominantTva(lines: QuoteLineForInvoice[]): 0 | 5.5 | 10 | 20 {
  if (!lines.length) return 20;
  const byRate = new Map<0 | 5.5 | 10 | 20, number>();
  for (const l of lines) {
    const ht = l.quantity * Number.parseFloat(l.unitPriceHt || "0");
    byRate.set(l.tvaRate, (byRate.get(l.tvaRate) ?? 0) + ht);
  }
  let best: 0 | 5.5 | 10 | 20 = 20;
  let bestHt = -1;
  for (const [rate, ht] of byRate) {
    if (ht > bestHt) {
      best = rate;
      bestHt = ht;
    }
  }
  return best;
}

export interface RefreshPendingInvoiceSyncsResult {
  refreshed: number;
  /** Syncs ignorés car le provider n’est plus connecté (pas une erreur métier). */
  skipped: number;
  updated: CaseInvoiceSyncStatus[];
  errors: Array<{ organizationId: string; caseId: string; syncId?: string; message: string }>;
}
