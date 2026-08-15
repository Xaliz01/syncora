import type {
  CreateUserSessionResponse,
  UserSessionResponse,
  ValidateUserSessionResponse,
} from "@planwise/shared";

export abstract class AbstractUserSessionsService {
  abstract createSession(
    userId: string,
    options?: { userAgent?: string },
  ): Promise<CreateUserSessionResponse>;
  abstract validateSession(userId: string, sessionId: string): Promise<ValidateUserSessionResponse>;
  abstract revokeSession(userId: string, sessionId?: string): Promise<void>;
  abstract revokeOtherSessions(userId: string, keepSessionId: string): Promise<void>;
  abstract listSessions(userId: string, currentSessionId?: string): Promise<UserSessionResponse[]>;
  /** Dernière activité (max lastSeenAt) par userId. */
  abstract getLatestLastSeenByUserIds(userIds: string[]): Promise<Record<string, string>>;
  /** userIds avec au moins une session vue depuis `since`, triés par activité récente. */
  abstract listUserIdsActiveSince(
    since: Date,
    options?: { limit?: number; offset?: number; userIds?: string[] },
  ): Promise<{ userIds: string[]; total: number }>;
}
