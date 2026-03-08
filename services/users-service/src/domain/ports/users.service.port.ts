import type {
  ActivateInvitedUserBody,
  CreateInvitedUserBody,
  CreateUserBody,
  UserResponse,
  ValidateCredentialsResponse
} from "@syncora/shared";

export abstract class AbstractUsersService {
  abstract create(body: CreateUserBody): Promise<UserResponse>;
  abstract invite(body: CreateInvitedUserBody): Promise<UserResponse>;
  abstract activateInvitedUser(id: string, body: ActivateInvitedUserBody): Promise<UserResponse>;
  abstract findById(id: string): Promise<UserResponse | null>;
  abstract listByOrganization(organizationId: string): Promise<UserResponse[]>;
  abstract validateCredentials(
    email: string,
    password: string
  ): Promise<ValidateCredentialsResponse | null>;
}
