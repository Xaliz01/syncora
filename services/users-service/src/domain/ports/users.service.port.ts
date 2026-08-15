import type {
  AccountUserResponse,
  ActivateInvitedUserBody,
  ChangePasswordBody,
  CreateAccountBody,
  CreateAccountResult,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
  InvitationActivationHintsResponse,
  IssueEmailVerificationResult,
  OrganizationMembershipResponse,
  PatchUserBody,
  PlatformUserSummary,
  UpdateUserNameBody,
  UserResponse,
  ValidateCredentialsResponse,
} from "@planwise/shared";

export { type CreateImpersonationAuditBody } from "./impersonation-audit.service.port";

export interface PlatformUsersDirectoryResult {
  users: PlatformUserSummary[];
  total: number;
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
  abstract updateName(id: string, body: UpdateUserNameBody): Promise<UserResponse>;
  abstract changePassword(id: string, body: ChangePasswordBody): Promise<void>;
  /** Id du premier admin de l'organisation (membership admin le plus ancien), ou null. */
  abstract findFoundingAdminUserId(organizationId: string): Promise<string | null>;
  abstract listPlatformDirectory(filters?: {
    search?: string;
    organizationId?: string;
    activeOnly?: boolean;
    /** Si false (défaut), exclut les e-mails de test / internes des métriques BO. */
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersDirectoryResult>;
  abstract getPlatformDashboardStats(): Promise<{
    userCount: number;
    connectedUserCount: number;
    recentLogins: Array<{
      userId: string;
      email: string;
      name?: string;
      organizationId?: string;
      lastLoginAt: string;
    }>;
  }>;
  /** Orgs ayant au moins un utilisateur dont l’e-mail est exclu des métriques BO. */
  abstract listOrganizationIdsWithExcludedEmails(): Promise<string[]>;
  abstract countUsersByOrganizationIds(
    organizationIds: string[],
  ): Promise<Record<string, { userCount: number; lastUserLoginAt?: string }>>;
}
