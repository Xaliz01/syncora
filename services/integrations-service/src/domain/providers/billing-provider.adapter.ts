import type { CaseInvoiceSyncStatus, IntegrationProvider } from "@planwise/shared";
import type {
  IntegrationCredentialDocument,
  IntegrationSyncDocument,
} from "../../persistence/integration.schema";

export const BILLING_PROVIDER_ADAPTERS = Symbol("BILLING_PROVIDER_ADAPTERS");

export interface BillingProviderAdapter {
  readonly provider: IntegrationProvider;

  /** Finalise un brouillon côté provider (localement pour la démo). */
  finalize(doc: IntegrationSyncDocument): Promise<CaseInvoiceSyncStatus>;

  /** Recharge l’état distant dans le document de synchronisation. */
  refresh(doc: IntegrationSyncDocument): Promise<CaseInvoiceSyncStatus>;

  /** Supprime le brouillon côté provider. Démo : sans effet. */
  deleteRemoteDraft(doc: IntegrationSyncDocument): Promise<void>;

  /** Révocation OAuth / nettoyage éventuel avant suppression du credential. */
  beforeDisconnect?(doc: IntegrationCredentialDocument): Promise<void>;
}
