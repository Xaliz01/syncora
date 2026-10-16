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
  ForgotPasswordBody,
  ForgotPasswordResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
  ResolveInvitationPreviewResponse,
} from "@planwise/shared";

/** Contexte optionnel de la requête HTTP (ex. User-Agent pour les sessions). */
export interface AuthRequestContext {
  userAgent?: string;
  /** Si un Bearer JWT valide est présent, id de l’utilisateur authentifié. */
  authenticatedUserId?: string;
}

export abstract class AbstractAuthService {
  abstract register(body: RegisterBody, context?: AuthRequestContext): Promise<AuthResponse>;
  abstract registerAccount(body: RegisterAccountBody): Promise<EmailVerificationRequiredResponse>;
  abstract verifyEmail(body: VerifyEmailBody): Promise<OnboardingAuthResponse>;
  abstract resendEmailVerification(
    body: ResendEmailVerificationBody,
  ): Promise<ResendEmailVerificationResponse>;
  abstract forgotPassword(body: ForgotPasswordBody): Promise<ForgotPasswordResponse>;
  abstract resetPassword(body: ResetPasswordBody): Promise<ResetPasswordResponse>;
  abstract getOnboardingUser(jwt: OnboardingJwtPayload): Promise<OnboardingUser>;
  abstract login(
    body: LoginBody,
    context?: AuthRequestContext,
  ): Promise<AuthResponse | OnboardingAuthResponse>;
  abstract resolveInvitation(invitationToken: string): Promise<ResolveInvitationPreviewResponse>;
  abstract acceptInvitation(
    body: AcceptInvitationBody,
    context?: AuthRequestContext,
  ): Promise<AuthResponse>;
  abstract createOrganization(
    body: CreateOrganizationBody,
    actor: JwtPayload | OnboardingJwtPayload,
    context?: AuthRequestContext,
  ): Promise<AuthResponse>;
  abstract switchOrganization(body: SwitchOrganizationBody, jwt: JwtPayload): Promise<AuthResponse>;
  abstract getSessionUser(jwt: JwtPayload): Promise<AuthUser>;
  abstract logout(jwt: JwtPayload): Promise<{ ok: true }>;
}
