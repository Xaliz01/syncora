import type {
  AcceptInvitationBody,
  RegisterBody,
  LoginBody,
  AuthResponse,
  AuthUser,
  JwtPayload,
  CreateOrganizationBody,
  SwitchOrganizationBody,
} from "@syncora/shared";

export abstract class AbstractAuthService {
  abstract register(body: RegisterBody): Promise<AuthResponse>;
  abstract login(body: LoginBody): Promise<AuthResponse>;
  abstract acceptInvitation(body: AcceptInvitationBody): Promise<AuthResponse>;
  abstract createOrganization(body: CreateOrganizationBody, jwt: JwtPayload): Promise<AuthResponse>;
  abstract switchOrganization(body: SwitchOrganizationBody, jwt: JwtPayload): Promise<AuthResponse>;
  abstract getSessionUser(jwt: JwtPayload): Promise<AuthUser>;
}
