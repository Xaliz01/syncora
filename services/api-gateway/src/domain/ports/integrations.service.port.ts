import type {
  AuthUser,
  ConnectPennylaneBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  SyncCaseToPennylaneResult,
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
}
