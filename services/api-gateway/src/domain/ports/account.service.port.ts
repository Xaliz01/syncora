import type {
  AuthUser,
  ChangePasswordBody,
  CompleteOnboardingProfileBody,
  CompleteOnboardingProfileResponse,
  CrispIdentityResponse,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  UserSessionsListResponse,
} from "@planwise/shared";

export abstract class AbstractAccountService {
  abstract updateName(user: AuthUser, body: UpdateUserNameBody): Promise<UserResponse>;
  abstract changePassword(user: AuthUser, body: ChangePasswordBody): Promise<void>;
  abstract getPreferences(user: AuthUser): Promise<UserPreferencesResponse>;
  abstract updatePreferences(
    user: AuthUser,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse>;
  abstract completeOnboardingProfile(
    user: AuthUser,
    body: CompleteOnboardingProfileBody,
  ): Promise<CompleteOnboardingProfileResponse>;
  abstract getCrispIdentity(user: AuthUser): Promise<CrispIdentityResponse>;
  abstract listSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<UserSessionsListResponse>;
  abstract revokeSession(userId: string, sessionId: string): Promise<void>;
  abstract revokeOtherSessions(userId: string, keepSessionId: string): Promise<void>;
}
