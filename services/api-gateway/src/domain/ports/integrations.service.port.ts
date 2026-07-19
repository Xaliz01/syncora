import type {
  AuthUser,
  ConnectPennylaneBody,
  ConnectQontoBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
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
    options?: { quoteId?: string },
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
    options?: { quoteId?: string; invoiceNumber?: string },
  ): Promise<SyncCaseToQontoResult>;
}
