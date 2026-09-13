/** Contrats API facturation locale (billing-service) — factures clients dans Planwise. */

import type { BillingStatus } from "./case";
import {
  aggregateCaseBillingStatus,
  CASE_INVOICE_KIND_LABELS,
  CASE_INVOICE_KINDS,
  type CaseInvoiceKind,
  type QuoteLineForInvoice,
  type RemoteInvoiceLifecycle,
  round2,
} from "./integrations";

export const BILLING_CONNECTORS_UNAVAILABLE_MESSAGE =
  "Les factures clients s’émettent dans Planwise, depuis un dossier ou l’écran Facturation.";

export const ELECTRONIC_INVOICING_NOTICE =
  "L’émission de factures via la facturation électronique arrivera prochainement.";

export const LOCAL_INVOICE_KINDS = [...CASE_INVOICE_KINDS, "credit_note"] as const;
export type LocalInvoiceKind = (typeof LOCAL_INVOICE_KINDS)[number];

export const LOCAL_INVOICE_KIND_LABELS: Record<LocalInvoiceKind, string> = {
  ...CASE_INVOICE_KIND_LABELS,
  credit_note: "Avoir",
};

export const LOCAL_INVOICE_STATUSES = ["draft", "finalized", "paid", "cancelled"] as const;
export type LocalInvoiceStatus = (typeof LOCAL_INVOICE_STATUSES)[number];

export const LOCAL_INVOICE_STATUS_LABELS: Record<LocalInvoiceStatus, string> = {
  draft: "Brouillon",
  finalized: "Finalisée",
  paid: "Payée",
  cancelled: "Annulée",
};

export type InvoicePartyType = "customer" | "order_giver";

export interface InvoicePartySnapshot {
  partyId: string;
  partyType: InvoicePartyType;
  displayName: string;
  email?: string;
  legalIdentifier?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface InvoiceSellerSnapshot {
  name: string;
  siret?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface LocalInvoiceLine {
  label: string;
  quantity: number;
  unitPriceHt: string;
  tvaRate: 0 | 5.5 | 10 | 20;
  unit?: string;
}

export const INVOICE_EMAIL_SEND_STATUSES = ["sent", "failed"] as const;
export type InvoiceEmailSendStatus = (typeof INVOICE_EMAIL_SEND_STATUSES)[number];

export interface InvoiceEmailSendEntry {
  sentAt: string;
  to: string;
  cc?: string[];
  sentByUserId: string;
  sentByName?: string;
  status: InvoiceEmailSendStatus;
  reason?: string;
}

export interface SendLocalInvoiceEmailBody {
  organizationId: string;
  to: string;
  cc?: string[];
  subject?: string;
  body?: string;
  sentByUserId: string;
  sentByName?: string;
}

export const INVOICE_EMAIL_COMMERCIAL_FOOTER = "Document envoyé depuis Planwise.";

export function isIssuedInvoiceStatus(status: LocalInvoiceStatus): boolean {
  return status === "finalized" || status === "paid";
}

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function defaultInvoiceEmailSubject(
  invoice: Pick<LocalInvoiceResponse, "kind" | "number">,
): string {
  const number = invoice.number?.trim() || "facture";
  return invoice.kind === "credit_note" ? `Avoir ${number}` : `Facture ${number}`;
}

export function defaultInvoiceEmailBody(
  invoice: Pick<LocalInvoiceResponse, "kind" | "number" | "amountHt" | "seller">,
): string {
  const number = invoice.number?.trim() || "";
  const doc = invoice.kind === "credit_note" ? "l’avoir" : "la facture";
  const who = invoice.seller?.name?.trim();
  const closing = who ? `\n\nCordialement\n${who}` : "\n\nCordialement";
  return `Bonjour,\n\nVeuillez trouver ci-joint ${doc} ${number} d’un montant de ${invoice.amountHt} € HT.${closing}`;
}

export function invoiceEmailFailureMessage(reason?: string): string {
  if (reason === "smtp_not_configured") {
    return "L’envoi d’e-mails n’est pas disponible pour le moment. Réessayez plus tard.";
  }
  return "L’envoi n’a pas pu aboutir. Vérifiez l’adresse et réessayez.";
}

export interface LocalInvoiceResponse {
  id: string;
  organizationId: string;
  caseId: string;
  quoteId?: string;
  kind: LocalInvoiceKind;
  status: LocalInvoiceStatus;
  number?: string;
  draftNumber?: string;
  invoiceDate: string;
  situationNumber?: number;
  situationPercent?: number;
  amountHt: string;
  amountTtc: string;
  lines: LocalInvoiceLine[];
  customer: InvoicePartySnapshot;
  seller?: InvoiceSellerSnapshot;
  creditedInvoiceId?: string;
  caseTitle?: string;
  emailSends?: InvoiceEmailSendEntry[];
  /** Interventions du dossier rattachées à cette facture (saisie libre). */
  interventionIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  finalizedAt?: string;
}

export interface LocalInvoicesListResponse {
  invoices: LocalInvoiceResponse[];
  total: number;
}

export interface LocalInvoiceStatsResponse {
  total: number;
  draftCount: number;
  finalizedCount: number;
  paidCount: number;
  cancelledCount: number;
  amountHtDraft: string;
  amountHtFinalized: string;
  amountHtPaid: string;
  amountHtTotal: string;
  byKind: Partial<Record<LocalInvoiceKind, number>>;
}

export interface CreateLocalInvoiceBody {
  organizationId: string;
  caseId: string;
  caseTitle?: string;
  quoteId?: string;
  kind: LocalInvoiceKind;
  lines: LocalInvoiceLine[];
  amountHt: string;
  invoiceDate?: string;
  situationNumber?: number;
  situationPercent?: number;
  creditedInvoiceId?: string;
  customer: InvoicePartySnapshot;
  seller?: InvoiceSellerSnapshot;
  draft?: boolean;
  interventionIds?: string[];
}

export interface CreditLocalInvoiceBody {
  organizationId: string;
  /** Montant HT à avoiriser (positif). Défaut : totalité de la facture d’origine. */
  amountHt?: number;
}

export function localInvoiceStatusToRemote(status: LocalInvoiceStatus): RemoteInvoiceLifecycle {
  return status;
}

export function localInvoicesToBillingAggregation(
  invoices: Array<Pick<LocalInvoiceResponse, "status" | "amountHt" | "kind">>,
): Array<{
  remoteStatus: RemoteInvoiceLifecycle;
  amountHt?: string;
  invoiceKind?: CaseInvoiceKind;
}> {
  return invoices.map((inv) => ({
    remoteStatus: localInvoiceStatusToRemote(inv.status),
    amountHt: inv.amountHt,
    invoiceKind: inv.kind === "credit_note" ? undefined : inv.kind,
  }));
}

export function lineAmountTtc(line: LocalInvoiceLine): number {
  const ht = round2(line.quantity * Number.parseFloat(line.unitPriceHt || "0"));
  return round2(ht * (1 + line.tvaRate / 100));
}

export function invoiceTotalsFromLines(lines: LocalInvoiceLine[]): {
  amountHt: string;
  amountTtc: string;
} {
  const ht = round2(
    lines.reduce(
      (sum, line) => sum + line.quantity * Number.parseFloat(line.unitPriceHt || "0"),
      0,
    ),
  );
  const ttc = round2(lines.reduce((sum, line) => sum + lineAmountTtc(line), 0));
  return { amountHt: ht.toFixed(2), amountTtc: ttc.toFixed(2) };
}

export function buildCreditNoteLines(input: {
  originalLines: QuoteLineForInvoice[] | LocalInvoiceLine[];
  originalAmountHt: number;
  creditAmountHt?: number;
  originalNumber?: string;
}): { lines: LocalInvoiceLine[]; amountHt: string } {
  const originalHt = round2(input.originalAmountHt);
  if (originalHt <= 0.009) {
    throw new Error("Impossible d’avoiriser une facture sans montant.");
  }
  const creditHt = round2(input.creditAmountHt ?? originalHt);
  if (creditHt <= 0) {
    throw new Error("Indiquez un montant HT d’avoir.");
  }
  if (creditHt > originalHt + 0.009) {
    throw new Error("L’avoir ne peut pas dépasser le montant de la facture d’origine.");
  }
  const ratio = originalHt === 0 ? 0 : creditHt / originalHt;
  const ref = input.originalNumber ? ` (facture ${input.originalNumber})` : "";
  const lines: LocalInvoiceLine[] = input.originalLines.map((line) => ({
    label: `Avoir — ${line.label}${ref}`.slice(0, 200),
    quantity: line.quantity,
    unitPriceHt: round2(-Number.parseFloat(line.unitPriceHt || "0") * ratio).toFixed(2),
    tvaRate: line.tvaRate,
    unit: line.unit,
  }));
  return { lines, amountHt: (-creditHt).toFixed(2) };
}

export function billingStatusFromLocalInvoices(
  invoices: Array<Pick<LocalInvoiceResponse, "status" | "amountHt" | "kind">>,
  quoteTotalHt = 0,
): BillingStatus | null {
  return aggregateCaseBillingStatus(localInvoicesToBillingAggregation(invoices), quoteTotalHt);
}

export function normalizeInvoiceInterventionIds(ids?: string[]): string[] {
  return [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
}

export function interventionBillingStatusFromInvoice(
  status: LocalInvoiceStatus,
): BillingStatus | null {
  if (status === "draft") return "invoice_draft";
  if (status === "finalized") return "invoiced";
  if (status === "paid") return "paid";
  if (status === "cancelled") return "to_invoice";
  return null;
}
