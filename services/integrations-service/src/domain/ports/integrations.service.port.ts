import type {
  CompletePennylaneOAuthBody,
  ConnectPennylaneBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
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
}
