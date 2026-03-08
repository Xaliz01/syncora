import type {
  AcceptInvitationBody,
  RegisterBody,
  LoginBody,
  AuthResponse
} from "@syncora/shared";

export abstract class AbstractAuthService {
  abstract register(body: RegisterBody): Promise<AuthResponse>;
  abstract login(body: LoginBody): Promise<AuthResponse>;
  abstract acceptInvitation(body: AcceptInvitationBody): Promise<AuthResponse>;
}
