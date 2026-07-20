import type {
  AuthUser,
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  ConnectPennylaneBody,
  ConnectQontoBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  SyncCaseInvoiceOptions,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoResult,
} from "@planwise/shared";

export abstract class AbstractIntegrationsGatewayService {
  abstract getPennylaneStatus(user: AuthUser): Promise<PennylaneConnectionStatus>;

  abstract startPennylaneOAuth(user: AuthUser): Promise<PennylaneOAuthStartResponse>;

  abstract completePennylaneOAuth(
    user: AuthUser,
    body: { code: string; state: string },
  ): Promise<PennylaneConnectionStatus>;

  abstract connectPennylane(
    user: AuthUser,
    body: Omit<ConnectPennylaneBody, "organizationId">,
  ): Promise<PennylaneConnectionStatus>;

  abstract disconnectPennylane(user: AuthUser): Promise<PennylaneConnectionStatus>;

  abstract syncCaseToPennylane(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToPennylaneResult>;

  abstract getQontoStatus(user: AuthUser): Promise<QontoConnectionStatus>;

  abstract startQontoOAuth(user: AuthUser): Promise<QontoOAuthStartResponse>;

  abstract completeQontoOAuth(
    user: AuthUser,
    body: { code: string; state: string },
  ): Promise<QontoConnectionStatus>;

  abstract connectQonto(
    user: AuthUser,
    body: Omit<ConnectQontoBody, "organizationId">,
  ): Promise<QontoConnectionStatus>;

  abstract disconnectQonto(user: AuthUser): Promise<QontoConnectionStatus>;

  abstract syncCaseToQonto(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToQontoResult>;

  abstract getCaseInvoiceSync(user: AuthUser, caseId: string): Promise<CaseInvoiceSyncListResponse>;

  abstract finalizeCaseInvoice(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus>;

  abstract refreshCaseInvoiceSync(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus>;

  abstract refreshAllCaseInvoiceSyncs(
    user: AuthUser,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse>;

  abstract deleteCaseInvoiceSync(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncListResponse>;
}
