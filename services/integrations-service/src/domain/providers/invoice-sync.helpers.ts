import type {
  CaseInvoiceKind,
  CaseInvoiceSyncStatus,
  IntegrationProvider,
  RemoteInvoiceLifecycle,
} from "@planwise/shared";
import { IntegrationSyncDocument } from "../../persistence/integration.schema";

export const PENNYLANE_PROVIDER = "pennylane";
export const QONTO_PROVIDER = "qonto";
export const DEMO_PROVIDER = "demo";
export const BILLING_PROVIDERS = [PENNYLANE_PROVIDER, QONTO_PROVIDER, DEMO_PROVIDER] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

/** Rafraîchir 60s avant expiration. */
export const REFRESH_SKEW_MS = 60_000;

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Extrait un SIREN/SIRET utilisable comme tax_identification_number Qonto. */
export function resolveQontoTaxId(
  legalIdentifier?: string,
  vatNumber?: string,
): string | undefined {
  const raw = (legalIdentifier || vatNumber || "").replace(/[\s.]/g, "").toUpperCase();
  if (!raw) return undefined;
  if (/^\d{9}$/.test(raw) || /^\d{14}$/.test(raw)) return raw;
  const vatMatch = raw.match(/^FR[A-Z0-9]{2}(\d{9})$/);
  if (vatMatch) return vatMatch[1];
  if (raw.length <= 20) return raw;
  return undefined;
}

export function mapPennylaneRemoteStatus(remote: {
  draft?: boolean;
  paid?: boolean;
  status?: string;
}): RemoteInvoiceLifecycle {
  if (remote.paid === true || remote.status === "paid") return "paid";
  if (remote.draft === true || remote.status === "draft") return "draft";
  if (remote.status === "cancelled" || remote.status === "archived") return "cancelled";
  if (remote.draft === false) return "finalized";
  return "unknown";
}

export function mapQontoRemoteStatus(status?: string): RemoteInvoiceLifecycle {
  const value = (status || "").toLowerCase();
  if (value === "draft") return "draft";
  if (value === "paid") return "paid";
  if (value === "canceled" || value === "cancelled") return "cancelled";
  if (value === "unpaid" || value === "sent" || value === "pending") return "finalized";
  return value ? "finalized" : "unknown";
}

/** Taille du lot cron (défaut 200, borné 1–500). */
export function resolveInvoiceSyncBatchSize(): number {
  const raw = Number.parseInt(process.env.INVOICE_SYNC_BATCH_SIZE ?? "200", 10);
  if (!Number.isFinite(raw)) return 200;
  return Math.min(500, Math.max(1, raw));
}

/** Lecture duale : nouveaux champs génériques, fallback legacy prod. */
export function syncRemoteCustomerId(doc: IntegrationSyncDocument): string {
  return (doc.providerCustomerId || doc.pennylaneCustomerId || "").trim();
}

export function syncRemoteInvoiceId(doc: IntegrationSyncDocument): string {
  return (doc.providerInvoiceId || doc.pennylaneInvoiceId || "").trim();
}

export function resolveRemoteLifecycle(doc: IntegrationSyncDocument): RemoteInvoiceLifecycle {
  return (
    (doc.remoteStatus as RemoteInvoiceLifecycle | undefined) ??
    (doc.draft === false ? "finalized" : "draft")
  );
}

export function invoiceMetaFromBody(body: {
  quoteId?: string;
  invoiceKind?: CaseInvoiceKind;
  situationNumber?: number;
  situationPercent?: number;
  amountHt?: string;
}): {
  quoteId?: string;
  invoiceKind: string;
  situationNumber?: number;
  situationPercent?: number;
  amountHt?: string;
} {
  return {
    ...(body.quoteId?.trim() ? { quoteId: body.quoteId.trim() } : {}),
    invoiceKind: body.invoiceKind || "full",
    ...(typeof body.situationNumber === "number" ? { situationNumber: body.situationNumber } : {}),
    ...(typeof body.situationPercent === "number"
      ? { situationPercent: body.situationPercent }
      : {}),
    ...(body.amountHt?.trim() ? { amountHt: body.amountHt.trim() } : {}),
  };
}

export async function persistRemoteInvoiceState(
  doc: IntegrationSyncDocument,
  state: {
    remoteStatus: RemoteInvoiceLifecycle;
    draft: boolean;
    invoiceNumber?: string;
    invoiceUrl?: string;
  },
): Promise<CaseInvoiceSyncStatus> {
  doc.remoteStatus = state.remoteStatus;
  doc.draft = state.draft;
  if (state.invoiceNumber) doc.invoiceNumber = state.invoiceNumber;
  if (state.invoiceUrl) doc.invoiceUrl = state.invoiceUrl;
  doc.lastSyncedAt = new Date();
  await doc.save();
  return toCaseInvoiceSyncStatus(doc);
}

export function toCaseInvoiceSyncStatus(doc: IntegrationSyncDocument): CaseInvoiceSyncStatus {
  const remoteStatus = resolveRemoteLifecycle(doc);
  const kind = (doc.invoiceKind as CaseInvoiceKind | undefined) || "full";
  const provider: IntegrationProvider =
    doc.provider === QONTO_PROVIDER
      ? "qonto"
      : doc.provider === DEMO_PROVIDER
        ? "demo"
        : "pennylane";
  return {
    id: String(doc._id),
    organizationId: doc.organizationId,
    provider,
    caseId: doc.caseId,
    quoteId: doc.quoteId,
    invoiceKind: kind,
    situationNumber: doc.situationNumber,
    situationPercent: doc.situationPercent,
    amountHt: doc.amountHt,
    remoteInvoiceId: syncRemoteInvoiceId(doc),
    remoteCustomerId: syncRemoteCustomerId(doc),
    draft: doc.draft !== false,
    remoteStatus,
    invoiceUrl: doc.invoiceUrl,
    invoiceNumber: doc.invoiceNumber,
    lastSyncedAt: doc.lastSyncedAt?.toISOString(),
    createdAt: (doc as { createdAt?: Date }).createdAt?.toISOString(),
  };
}
