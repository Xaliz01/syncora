import type {
  AcceptInvitationBody,
  RegisterBody,
  RegisterAccountBody,
  LoginBody,
  AuthResponse,
  AuthUser,
  JwtPayload,
  OnboardingAuthResponse,
  OnboardingJwtPayload,
  OnboardingUser,
  CreateOrganizationBody,
  SwitchOrganizationBody,
  EmailVerificationRequiredResponse,
  VerifyEmailBody,
  ResendEmailVerificationBody,
  ResendEmailVerificationResponse,
  ResolveInvitationPreviewResponse,
} from "@planwise/shared";

export abstract class AbstractAuthService {
  abstract register(body: RegisterBody): Promise<AuthResponse>;
  abstract registerAccount(body: RegisterAccountBody): Promise<EmailVerificationRequiredResponse>;
  abstract verifyEmail(body: VerifyEmailBody): Promise<OnboardingAuthResponse>;
  abstract resendEmailVerification(
    body: ResendEmailVerificationBody,
  ): Promise<ResendEmailVerificationResponse>;
  abstract getOnboardingUser(jwt: OnboardingJwtPayload): Promise<OnboardingUser>;
  abstract login(body: LoginBody): Promise<AuthResponse | OnboardingAuthResponse>;
  abstract resolveInvitation(invitationToken: string): Promise<ResolveInvitationPreviewResponse>;
  abstract acceptInvitation(body: AcceptInvitationBody): Promise<AuthResponse>;
  abstract createOrganization(
    body: CreateOrganizationBody,
    actor: JwtPayload | OnboardingJwtPayload,
  ): Promise<AuthResponse>;
  abstract switchOrganization(body: SwitchOrganizationBody, jwt: JwtPayload): Promise<AuthResponse>;
  abstract getSessionUser(jwt: JwtPayload): Promise<AuthUser>;
  abstract logout(jwt: JwtPayload): Promise<{ ok: true }>;
}
