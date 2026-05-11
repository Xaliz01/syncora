import type {
  ActivateInvitedUserBody,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
  OrganizationMembershipResponse,
  PatchUserBody,
  UserResponse,
  ValidateCredentialsResponse
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
    body: CreateOrganizationMembershipBody
  ): Promise<OrganizationMembershipResponse>;
  abstract validateCredentials(
    email: string,
    password: string
  ): Promise<ValidateCredentialsResponse | null>;
}
