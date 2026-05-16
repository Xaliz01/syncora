import type {
  ActivateInvitedUserBody,
  ChangePasswordBody,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
  OrganizationMembershipResponse,
  PatchUserBody,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  ValidateCredentialsResponse,
} from "@syncora/shared";

export abstract class AbstractUsersService {
  abstract create(body: CreateUserBody): Promise<UserResponse>;
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
}
