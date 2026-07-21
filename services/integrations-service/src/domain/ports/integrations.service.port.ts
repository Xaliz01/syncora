import type {
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  CompletePennylaneOAuthBody,
  CompleteQontoOAuthBody,
  ConnectPennylaneBody,
  ConnectQontoBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  RefreshPendingInvoiceSyncsResult,
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

  abstract getCaseInvoiceSync(
    organizationId: string,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse>;

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
      authMethod?: "oauth" | "api_token";
      companyName?: string;
      companyId?: string;
      tokenHint?: string;
      connectedAt?: string;
    }>;
    total: number;
  }>;
}
