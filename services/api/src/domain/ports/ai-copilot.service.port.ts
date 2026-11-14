import type {
  AiQuotaStatusResponse,
  AuthUser,
  CopilotCreateSessionBody,
  CopilotDecideBody,
  CopilotSessionListResponse,
  CopilotSessionResponse,
} from "@planwise/shared";

export abstract class AbstractAiCopilotService {
  abstract createSession(
    user: AuthUser,
    body: CopilotCreateSessionBody,
  ): Promise<CopilotSessionResponse>;

  abstract decide(
    user: AuthUser,
    sessionId: string,
    body: CopilotDecideBody,
  ): Promise<CopilotSessionResponse>;

  abstract listSessions(
    user: AuthUser,
    limit: number,
    offset: number,
  ): Promise<CopilotSessionListResponse>;

  abstract getSession(user: AuthUser, sessionId: string): Promise<CopilotSessionResponse>;

  abstract getAudio(user: AuthUser, sessionId: string): Promise<{ mimeType: string; data: Buffer }>;

  abstract getQuota(user: AuthUser): Promise<AiQuotaStatusResponse>;
}
