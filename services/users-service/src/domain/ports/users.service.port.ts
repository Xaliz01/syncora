import type {
  AccountUserResponse,
  ActivateInvitedUserBody,
  ChangePasswordBody,
  CreateAccountBody,
  CreateAccountResult,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateProspectOutreachBody,
  CreateUserBody,
  CreateUserSessionResponse,
  InvitationActivationHintsResponse,
  IssueEmailVerificationResult,
  OrganizationMembershipResponse,
  PatchUserBody,
  PlatformUserSummary,
  ProspectOutreachResponse,
  ProspectOutreachesBySirensResponse,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  UserSessionResponse,
  ValidateCredentialsResponse,
  ValidateUserSessionResponse,
} from "@planwise/shared";

export interface PlatformUsersDirectoryResult {
  users: PlatformUserSummary[];
  total: number;
}

export interface CreateImpersonationAuditBody {
  impersonatorUserId: string;
  impersonatorEmail: string;
  targetUserId: string;
  targetEmail: string;
  organizationId: string;
  reason: string;
  expiresAt?: string;
}

export abstract class AbstractUsersService {
  abstract create(body: CreateUserBody): Promise<UserResponse>;
  abstract createAccount(body: CreateAccountBody): Promise<CreateAccountResult>;
  abstract verifyEmail(email: string, code: string): Promise<AccountUserResponse>;
  abstract resendEmailVerification(email: string): Promise<IssueEmailVerificationResult>;
  abstract findAccountById(id: string): Promise<AccountUserResponse | null>;
  abstract invite(body: CreateInvitedUserBody): Promise<UserResponse>;
  abstract activateInvitedUser(id: string, body: ActivateInvitedUserBody): Promise<UserResponse>;
  abstract getInvitationActivationHints(userId: string): Promise<InvitationActivationHintsResponse>;
  abstract updateInvitedUserEmail(
    userId: string,
    organizationId: string,
    email: string,
  ): Promise<UserResponse>;
  abstract cancelOrganizationInvitation(userId: string, organizationId: string): Promise<void>;
  abstract deactivateOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<UserResponse>;
  abstract reactivateOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<UserResponse>;
  abstract patch(id: string, body: PatchUserBody): Promise<UserResponse>;
  abstract findById(id: string, organizationId?: string): Promise<UserResponse | null>;
  abstract listByOrganization(organizationId: string): Promise<UserResponse[]>;
  abstract listOrganizationMemberships(userId: string): Promise<OrganizationMembershipResponse[]>;
  abstract addOrganizationMembership(
    userId: string,
    body: CreateOrganizationMembershipBody,
  ): Promise<OrganizationMembershipResponse>;
  abstract validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidateCredentialsResponse | null>;
  abstract createSession(
    userId: string,
    options?: { userAgent?: string },
  ): Promise<CreateUserSessionResponse>;
  abstract validateSession(userId: string, sessionId: string): Promise<ValidateUserSessionResponse>;
  abstract revokeSession(userId: string, sessionId?: string): Promise<void>;
  abstract revokeOtherSessions(userId: string, keepSessionId: string): Promise<void>;
  abstract listSessions(userId: string, currentSessionId?: string): Promise<UserSessionResponse[]>;
  abstract updateName(id: string, body: UpdateUserNameBody): Promise<UserResponse>;
  abstract changePassword(id: string, body: ChangePasswordBody): Promise<void>;
  abstract getPreferences(
    userId: string,
    organizationId?: string,
  ): Promise<UserPreferencesResponse>;
  abstract updatePreferences(
    userId: string,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse>;
  /** Id du premier admin de l’organisation (membership admin le plus ancien), ou null. */
  abstract findFoundingAdminUserId(organizationId: string): Promise<string | null>;
  abstract listPlatformDirectory(filters?: {
    search?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersDirectoryResult>;
  abstract countUsersByOrganizationIds(
    organizationIds: string[],
  ): Promise<Record<string, { userCount: number; lastUserLoginAt?: string }>>;
  abstract createImpersonationAudit(body: CreateImpersonationAuditBody): Promise<{ id: string }>;
  abstract createProspectOutreach(
    body: CreateProspectOutreachBody,
  ): Promise<ProspectOutreachResponse>;
  abstract listProspectOutreachesBySirens(
    sirens: string[],
  ): Promise<ProspectOutreachesBySirensResponse>;
}
