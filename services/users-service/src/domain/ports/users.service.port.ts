import type {
  AccountUserResponse,
  ActivateInvitedUserBody,
  ChangePasswordBody,
  CreateAccountBody,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
  OrganizationMembershipResponse,
  PatchUserBody,
  PlatformUserSummary,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  ValidateCredentialsResponse,
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
  abstract createAccount(body: CreateAccountBody): Promise<AccountUserResponse>;
  abstract findAccountById(id: string): Promise<AccountUserResponse | null>;
  abstract invite(body: CreateInvitedUserBody): Promise<UserResponse>;
  abstract activateInvitedUser(id: string, body: ActivateInvitedUserBody): Promise<UserResponse>;
  abstract patch(id: string, body: PatchUserBody): Promise<UserResponse>;
  abstract findById(id: string): Promise<UserResponse | null>;
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
  abstract getPreferences(userId: string): Promise<UserPreferencesResponse>;
  abstract updatePreferences(
    userId: string,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse>;
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
}
