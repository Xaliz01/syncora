import type {
  CompletePennylaneOAuthBody,
  CompleteQontoOAuthBody,
  ConnectPennylaneBody,
  ConnectQontoBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
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
}
