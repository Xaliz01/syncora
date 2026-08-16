import type {
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  CompletePennylaneOAuthBody,
  CompleteQontoOAuthBody,
  ConnectPennylaneBody,
  ConnectQontoBody,
  DemoConnectionStatus,
  OrganizationInvoiceSyncStatsResponse,
  OrganizationInvoiceSyncsListResponse,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  RefreshPendingInvoiceSyncsResult,
  SyncCaseToDemoBody,
  SyncCaseToDemoResult,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoBody,
  SyncCaseToQontoResult,
} from "@planwise/shared";

export abstract class AbstractIntegrationsService {
  abstract getPennylaneStatus(organizationId: string): Promise<PennylaneConnectionStatus>;

  abstract startPennylaneOAuth(organizationId: string): Promise<PennylaneOAuthStartResponse>;

  abstract completePennylaneOAuth(
    body: CompletePennylaneOAuthBody,
  ): Promise<PennylaneConnectionStatus>;

  abstract connectPennylane(body: ConnectPennylaneBody): Promise<PennylaneConnectionStatus>;

  abstract disconnectPennylane(organizationId: string): Promise<PennylaneConnectionStatus>;

  abstract syncCaseToPennylane(body: SyncCaseToPennylaneBody): Promise<SyncCaseToPennylaneResult>;

  abstract getQontoStatus(organizationId: string): Promise<QontoConnectionStatus>;

  abstract startQontoOAuth(organizationId: string): Promise<QontoOAuthStartResponse>;

  abstract completeQontoOAuth(body: CompleteQontoOAuthBody): Promise<QontoConnectionStatus>;

  abstract connectQonto(body: ConnectQontoBody): Promise<QontoConnectionStatus>;

  abstract disconnectQonto(organizationId: string): Promise<QontoConnectionStatus>;

  abstract syncCaseToQonto(body: SyncCaseToQontoBody): Promise<SyncCaseToQontoResult>;

  abstract getDemoStatus(organizationId: string): Promise<DemoConnectionStatus>;

  abstract connectDemo(organizationId: string): Promise<DemoConnectionStatus>;

  abstract disconnectDemo(organizationId: string): Promise<DemoConnectionStatus>;

  abstract syncCaseToDemo(body: SyncCaseToDemoBody): Promise<SyncCaseToDemoResult>;

  abstract getCaseInvoiceSync(
    organizationId: string,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse>;

  abstract listOrganizationInvoiceSyncs(
    organizationId: string,
    filters?: {
      remoteStatus?: string;
      provider?: string;
      invoiceKind?: string;
      startDate?: string;
      endDate?: string;
      caseIds?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<OrganizationInvoiceSyncsListResponse>;

  abstract getOrganizationInvoiceSyncStats(
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      provider?: string;
    },
  ): Promise<OrganizationInvoiceSyncStatsResponse>;

  abstract finalizeCaseInvoice(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus>;

  abstract refreshCaseInvoiceSync(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus>;

  abstract refreshAllCaseInvoiceSyncs(
    organizationId: string,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse>;

  abstract deleteCaseInvoiceSync(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncListResponse>;

  abstract refreshPendingInvoiceSyncs(): Promise<RefreshPendingInvoiceSyncsResult>;

  /**
   * Marque les syncs d’un dossier comme orphelines (dossier 404) sans les supprimer —
   * conserve la trace facture ; le cron les ignore ensuite.
   */
  abstract markInvoiceSyncsCaseMissing(organizationId: string, caseId: string): Promise<number>;

  /** Purge données d’essai : syncs + credentials mode démo de l’organisation. */
  abstract purgeTestData(organizationId: string): Promise<{ purged: true }>;

  abstract listPlatformIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    integrations: Array<{
      organizationId: string;
      provider: string;
      connected: boolean;
      authMethod?: "oauth" | "api_token" | "demo";
      companyName?: string;
      companyId?: string;
      tokenHint?: string;
      connectedAt?: string;
    }>;
    total: number;
  }>;
}
