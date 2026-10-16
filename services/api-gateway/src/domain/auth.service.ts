import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { EventEmitter2 } from "@nestjs/event-emitter";
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
  EffectivePermissionsResponse,
  InvitationResponse,
  OrganizationMembershipResponse,
  OrganizationResponse,
  UserResponse,
  ValidateCredentialsResponse,
  PermissionCode,
  CreateOrganizationBody,
  SwitchOrganizationBody,
  AccountUserResponse,
  CreateAccountResult,
  EmailVerificationRequiredResponse,
  VerifyEmailBody,
  ResendEmailVerificationBody,
  ResendEmailVerificationResponse,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
  IssueEmailVerificationResult,
  IssuePasswordResetResult,
  ResolveInvitationPreviewResponse,
  UserRole,
  UserStatus,
} from "@planwise/shared";
import {
  ASSIGNABLE_PERMISSION_CODES,
  getPasswordPolicyError,
  isOnboardingJwtPayload,
} from "@planwise/shared";
import { AbstractAuthService, type AuthRequestContext } from "./ports/auth.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import {
  ACCOUNT_REGISTERED_EVENT,
  type AccountRegisteredEvent,
} from "../infrastructure/account-registered.event";
import {
  ORGANIZATION_CREATED_EVENT,
  type OrganizationCreatedEvent,
} from "../infrastructure/organization-created.event";
import { AbstractUsersService } from "./users/ports/users.service.port";
import { AbstractUserSessionsService } from "./users/ports/user-sessions.service.port";
import { AbstractOrganizationsService } from "./organizations/ports/organizations.service.port";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";
import { AbstractTechniciansService } from "./technicians/ports/technicians.service.port";
import { AbstractEmailService } from "./notifications/ports/email.service.port";

function downstreamStatus(err: unknown): number | undefined {
  if (err instanceof HttpException) return err.getStatus();
  return (err as { response?: { status?: number } })?.response?.status;
}

function downstreamMessage(err: unknown): string | undefined {
  if (err instanceof HttpException) {
    const body = err.getResponse();
    if (typeof body === "string") return body;
    if (body && typeof body === "object" && "message" in body) {
      const message = (body as { message?: string | string[] }).message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string") return message;
    }
  }
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(message) ? message.join(", ") : message;
}

function buildOrganizationCreatePayload(body: CreateOrganizationBody): CreateOrganizationBody {
  const email = body.email?.trim() ?? "";
  if (!email || !email.includes("@")) {
    throw new BadRequestException("L’e-mail de facturation de l’organisation est requis");
  }
  return {
    name: body.name.trim(),
    siret: body.siret.trim(),
    email,
    addressLine1: body.addressLine1?.trim() || undefined,
    addressLine2: body.addressLine2?.trim() || undefined,
    postalCode: body.postalCode?.trim() || undefined,
    city: body.city?.trim() || undefined,
    country: body.country?.trim() || undefined,
  };
}

function isNonProduction(): boolean {
  return process.env.NODE_ENV !== "production";
}

@Injectable()
export class AuthService extends AbstractAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
    private readonly eventEmitter: EventEmitter2,
    private readonly users: AbstractUsersService,
    private readonly sessions: AbstractUserSessionsService,
    private readonly organizations: AbstractOrganizationsService,
    private readonly permissions: AbstractPermissionsService,
    private readonly technicians: AbstractTechniciansService,
    private readonly email: AbstractEmailService,
  ) {
    super();
  }

  async getSessionUser(jwt: JwtPayload): Promise<AuthUser> {
    const role = await this.resolveMembershipRole(jwt.sub, jwt.organizationId, jwt.role);
    const permissions = await this.mergePermissionsWithSubscription(
      jwt.organizationId,
      jwt.sub,
      role,
    );
    const profile = await this.resolveUserProfile(jwt.sub);
    const [technicianId, isFoundingAdmin] = await Promise.all([
      this.resolveTechnicianId(jwt.organizationId, jwt.sub),
      this.resolveIsFoundingAdmin(jwt.organizationId, jwt.sub),
    ]);
    return {
      id: jwt.sub,
      email: profile?.email ?? jwt.email,
      organizationId: jwt.organizationId,
      role,
      status: profile?.status ?? jwt.status,
      permissions,
      name: profile?.name ?? jwt.name,
      technicianId,
      isFoundingAdmin,
      ...(jwt.impersonatorId
        ? {
            impersonatorId: jwt.impersonatorId,
            impersonatorEmail: jwt.impersonatorEmail,
          }
        : {}),
    };
  }

  async register(body: RegisterBody, context?: AuthRequestContext): Promise<AuthResponse> {
    if (!body.organizationSiret?.trim()) {
      throw new BadRequestException("Le SIRET de l'organisation est requis");
    }

    let org: OrganizationResponse;
    try {
      org = await this.organizations.create(
        buildOrganizationCreatePayload({
          name: body.organizationName,
          siret: body.organizationSiret.trim(),
          email: body.adminEmail,
        }),
      );
    } catch (err: unknown) {
      if (downstreamStatus(err) === 409) {
        throw new ConflictException("Ce nom d'organisation est déjà utilisé");
      }
      throw err;
    }

    let user: UserResponse;
    try {
      user = await this.users.create({
        organizationId: org.id,
        email: body.adminEmail,
        password: body.adminPassword,
        name: body.adminName,
        role: "admin",
      });
    } catch (err: unknown) {
      if (downstreamStatus(err) === 409) {
        throw new ConflictException("Un utilisateur avec cet email existe déjà");
      }
      throw err;
    }

    this.eventEmitter.emit(ORGANIZATION_CREATED_EVENT, {
      organizationId: org.id,
      name: org.name,
      ...(org.siret ? { siret: org.siret } : {}),
      ...(org.email ? { email: org.email } : { email: body.adminEmail }),
      createdByUserId: user.id,
      createdByEmail: user.email,
    } satisfies OrganizationCreatedEvent);

    const permissions = await this.mergePermissionsWithSubscription(
      user.organizationId,
      user.id,
      user.role,
    );
    return this.issueOrganizationAuth({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
      userAgent: context?.userAgent,
    });
  }

  async registerAccount(body: RegisterAccountBody): Promise<EmailVerificationRequiredResponse> {
    const passwordError = getPasswordPolicyError(body.password);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    let created: CreateAccountResult;
    try {
      created = await this.users.createAccount({
        email: body.email,
        password: body.password,
        name: body.name,
      });
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      const message = downstreamMessage(err);
      if (status === 409) throw new ConflictException("Un utilisateur avec cet email existe déjà");
      if (status === 400) throw new BadRequestException(message ?? "Données invalides");
      throw err;
    }

    if (created.emailVerificationCode) {
      await this.sendEmailVerificationCode(created.user.email, created.emailVerificationCode);
    }

    const registered: AccountRegisteredEvent = {
      userId: created.user.id,
      email: created.user.email,
      ...(created.user.name ? { name: created.user.name } : {}),
    };
    this.eventEmitter.emit(ACCOUNT_REGISTERED_EVENT, registered);

    const response: EmailVerificationRequiredResponse = {
      status: "email_verification_required",
      email: created.user.email,
    };
    if (isNonProduction() && created.emailVerificationCode) {
      response.debugVerificationCode = created.emailVerificationCode;
    }
    return response;
  }

  async verifyEmail(body: VerifyEmailBody): Promise<OnboardingAuthResponse> {
    let user: AccountUserResponse;
    try {
      user = await this.users.verifyEmail(body.email, body.code);
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      if (status === 401) {
        throw new UnauthorizedException("Code de vérification invalide ou expiré");
      }
      if (status === 400) {
        throw new BadRequestException("Email et code sont requis");
      }
      throw err;
    }

    return this.issueOnboardingAuth(user);
  }

  async resendEmailVerification(
    body: ResendEmailVerificationBody,
  ): Promise<ResendEmailVerificationResponse> {
    let issued: IssueEmailVerificationResult | null = null;
    try {
      issued = await this.users.resendEmailVerification(body.email);
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      const message = downstreamMessage(err);
      if (status === 400) {
        throw new BadRequestException(
          message ?? "Veuillez patienter avant de demander un nouveau code",
        );
      }
      // 404 : ne pas révéler si l'email existe — réponse neutre.
      if (status === 404) {
        return { ok: true };
      }
      throw err;
    }

    if (issued) {
      await this.sendEmailVerificationCode(issued.email, issued.emailVerificationCode);
    }

    const response: ResendEmailVerificationResponse = { ok: true };
    if (issued && isNonProduction()) {
      response.debugVerificationCode = issued.emailVerificationCode;
    }
    return response;
  }

  async forgotPassword(body: ForgotPasswordBody): Promise<ForgotPasswordResponse> {
    let issued: IssuePasswordResetResult | null = null;
    try {
      issued = await this.users.requestPasswordReset(body.email);
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      const message = downstreamMessage(err);
      if (status === 400) {
        throw new BadRequestException(
          message ?? "Veuillez patienter avant de demander un nouveau lien",
        );
      }
      // 404 : ne pas révéler si l'email existe — réponse neutre.
      if (status === 404) {
        return { ok: true };
      }
      throw err;
    }

    if (issued) {
      await this.sendPasswordResetEmail(issued.email, issued.resetToken);
    }

    const response: ForgotPasswordResponse = { ok: true };
    if (issued && isNonProduction()) {
      response.debugResetToken = issued.resetToken;
    }
    return response;
  }

  async resetPassword(body: ResetPasswordBody): Promise<ResetPasswordResponse> {
    const policyError = getPasswordPolicyError(body.newPassword ?? "");
    if (policyError) {
      throw new BadRequestException(policyError);
    }
    try {
      await this.users.confirmPasswordReset({
        token: body.token,
        newPassword: body.newPassword,
      });
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      const message = downstreamMessage(err);
      if (status === 401) {
        throw new UnauthorizedException("Lien de réinitialisation invalide ou expiré");
      }
      if (status === 400) {
        throw new BadRequestException(message ?? "Réinitialisation impossible");
      }
      throw err;
    }
    return { ok: true };
  }

  async getOnboardingUser(jwt: OnboardingJwtPayload): Promise<OnboardingUser> {
    const account = await this.resolveAccountProfile(jwt.sub);
    if (!account) {
      throw new UnauthorizedException("Utilisateur introuvable");
    }
    if (account.emailVerified === false) {
      throw new ForbiddenException("Adresse e-mail non vérifiée");
    }
    return {
      id: account.id,
      email: account.email,
      name: account.name,
      status: account.status,
    };
  }

  private issueOnboardingAuth(user: AccountUserResponse): OnboardingAuthResponse {
    const payload: OnboardingJwtPayload = {
      kind: "onboarding",
      sub: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: "1d" });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      },
    };
  }

  private async sendEmailVerificationCode(email: string, code: string): Promise<void> {
    try {
      const res = await this.email.sendTransactionalEmail(
        email,
        "Vérifiez votre adresse e-mail",
        `Bonjour,\n\nVotre code de vérification Planwise est : ${code}\n\nIl expire dans 15 minutes. Si vous recevez plusieurs e-mails, seul le dernier code est valable.\n\nSi vous n'avez pas créé de compte, ignorez cet e-mail.`,
      );
      if (!res.sent) {
        this.logger.warn(`Email verification OTP not sent to ${email}: ${res.reason ?? "unknown"}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to send email verification OTP to ${email}`, (err as Error).message);
    }
  }

  private async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetPath = `/reset-password?token=${encodeURIComponent(resetToken)}`;
    try {
      const res = await this.email.sendTransactionalEmail(
        email,
        "Réinitialisation de votre mot de passe",
        `Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe Planwise.\n\nCliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail — votre mot de passe actuel reste inchangé.`,
        resetPath,
        "Choisir un nouveau mot de passe",
      );
      if (!res.sent) {
        this.logger.warn(`Password reset email not sent to ${email}: ${res.reason ?? "unknown"}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to send password reset email to ${email}`, (err as Error).message);
    }
  }

  async login(
    body: LoginBody,
    context?: AuthRequestContext,
  ): Promise<AuthResponse | OnboardingAuthResponse> {
    let user: ValidateCredentialsResponse;
    try {
      const result = await this.users.validateCredentials(body.email, body.password);
      if (!result) throw new UnauthorizedException("Email ou mot de passe incorrect");
      user = result;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const status = downstreamStatus(err);
      const normalized = downstreamMessage(err);
      if (status === 403) {
        throw new ForbiddenException(
          normalized ??
            "Votre accès à l'organisation a été désactivé. Contactez un administrateur pour être réactivé.",
        );
      }
      throw err;
    }

    if (user.emailVerified === false) {
      throw new ForbiddenException(
        "Adresse e-mail non vérifiée. Consultez votre boîte mail pour le code de vérification.",
      );
    }

    if (!user.organizationId?.trim() || !user.role) {
      return this.issueOnboardingAuth({
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        emailVerified: true,
      });
    }

    const permissions = await this.mergePermissionsWithSubscription(
      user.organizationId,
      user.id,
      user.role,
    );
    const technicianId = await this.resolveTechnicianId(user.organizationId, user.id);
    return this.issueOrganizationAuth({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
      technicianId,
      userAgent: context?.userAgent,
    });
  }

  async createOrganization(
    body: CreateOrganizationBody,
    actor: JwtPayload | OnboardingJwtPayload,
    context?: AuthRequestContext,
  ): Promise<AuthResponse> {
    if (!body.name?.trim()) {
      throw new BadRequestException("Le nom de l’organisation est requis");
    }

    if (!body.siret?.trim()) {
      throw new BadRequestException("Le SIRET de l\u2019organisation est requis");
    }

    const userId = actor.sub;
    if (isOnboardingJwtPayload(actor)) {
      const account = await this.resolveAccountProfile(userId);
      if (!account) {
        throw new UnauthorizedException("Utilisateur introuvable");
      }
      const existingOrgUser = await this.resolveUserProfile(userId);
      if (existingOrgUser?.organizationId?.trim()) {
        throw new BadRequestException(
          "Ce compte est déjà rattaché à une organisation. Connectez-vous pour continuer.",
        );
      }
    }

    let org: OrganizationResponse;
    try {
      org = await this.organizations.create(buildOrganizationCreatePayload(body));
    } catch (err: unknown) {
      if (downstreamStatus(err) === 409) {
        throw new ConflictException("Ce nom d'organisation est déjà utilisé");
      }
      throw err;
    }

    await this.users.addOrganizationMembership(userId, {
      organizationId: org.id,
      role: "admin",
      membershipStatus: "active",
    });

    let user: UserResponse;
    try {
      user = await this.users.patch(userId, { organizationId: org.id });
    } catch (err: unknown) {
      if (downstreamStatus(err) === 404) throw new UnauthorizedException("Utilisateur introuvable");
      throw err;
    }

    this.eventEmitter.emit(ORGANIZATION_CREATED_EVENT, {
      organizationId: org.id,
      name: org.name,
      ...(org.siret ? { siret: org.siret } : {}),
      ...(org.email ? { email: org.email } : {}),
      createdByUserId: user.id,
      createdByEmail: user.email,
    } satisfies OrganizationCreatedEvent);

    const permissions = await this.mergePermissionsWithSubscription(
      user.organizationId,
      user.id,
      user.role,
    );
    return this.issueOrganizationAuth({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
      userAgent: context?.userAgent,
    });
  }

  async switchOrganization(body: SwitchOrganizationBody, jwt: JwtPayload): Promise<AuthResponse> {
    const targetId = body.organizationId?.trim();
    if (!targetId) {
      throw new BadRequestException("organizationId est requis");
    }
    if (targetId === jwt.organizationId) {
      throw new BadRequestException("Vous êtes déjà sur cette organisation.");
    }

    let memberships: OrganizationMembershipResponse[];
    try {
      memberships = await this.users.listOrganizationMemberships(jwt.sub);
    } catch (err: unknown) {
      if (downstreamStatus(err) === 404) throw new UnauthorizedException("Utilisateur introuvable");
      throw err;
    }

    const targetMembership = memberships.find(
      (m) => m.organizationId === targetId && m.membershipStatus === "active",
    );
    if (!targetMembership) {
      throw new ForbiddenException("Organisation non accessible pour ce compte.");
    }

    let user: UserResponse;
    try {
      user = await this.users.patch(jwt.sub, { organizationId: targetId });
    } catch (err: unknown) {
      if (downstreamStatus(err) === 404) throw new UnauthorizedException("Utilisateur introuvable");
      throw err;
    }

    const role = targetMembership.role;
    const permissions = await this.mergePermissionsWithSubscription(
      user.organizationId,
      user.id,
      role,
    );
    const technicianId = await this.resolveTechnicianId(user.organizationId, user.id);
    return this.issueOrganizationAuth({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role,
      status: user.status,
      permissions,
      name: user.name,
      technicianId,
      reuseSessionId: jwt.sid,
    });
  }

  async logout(jwt: JwtPayload): Promise<{ ok: true }> {
    if (jwt.impersonatorId || !jwt.sid?.trim()) {
      return { ok: true };
    }
    try {
      await this.sessions.revokeSession(jwt.sub, jwt.sid);
    } catch {
      // Logout client-side even if revoke fails (session already gone).
    }
    return { ok: true };
  }

  async acceptInvitation(
    body: AcceptInvitationBody,
    context?: AuthRequestContext,
  ): Promise<AuthResponse> {
    let invitation: InvitationResponse;
    try {
      invitation = await this.permissions.resolveInvitation(body.invitationToken);
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      if (status === 404) throw new UnauthorizedException("Invitation introuvable");
      if (status === 409) throw new UnauthorizedException("Cette invitation a déjà été utilisée");
      throw err;
    }

    let user: UserResponse;
    try {
      const activateBody: {
        password?: string;
        name?: string;
        organizationId: string;
        trustedAuthenticatedUserId?: string;
      } = {
        name: body.name,
        organizationId: invitation.organizationId,
      };
      const sessionMatchesInvite =
        Boolean(context?.authenticatedUserId) &&
        context?.authenticatedUserId === invitation.invitedUserId;
      if (sessionMatchesInvite) {
        activateBody.trustedAuthenticatedUserId = invitation.invitedUserId;
      } else {
        if (!body.password?.trim()) {
          throw new UnauthorizedException("Mot de passe requis");
        }
        activateBody.password = body.password;
      }
      user = await this.users.activateInvitedUser(invitation.invitedUserId, activateBody);
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const status = downstreamStatus(err);
      const message = downstreamMessage(err);
      if (status === 404) throw new UnauthorizedException("Utilisateur invité introuvable");
      if (status === 401) {
        throw new UnauthorizedException(message ?? "Mot de passe incorrect");
      }
      if (status === 400)
        throw new UnauthorizedException(message ?? "État d'activation de l'invitation invalide");
      throw err;
    }

    try {
      await this.permissions.acceptInvitation(body.invitationToken);
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      if (status === 404) throw new UnauthorizedException("Impossible de finaliser l'invitation");
      if (status === 409) throw new UnauthorizedException("Cette invitation a déjà été utilisée");
      throw err;
    }

    const permissions = await this.mergePermissionsWithSubscription(
      user.organizationId,
      user.id,
      user.role,
    );
    const technicianId = await this.resolveTechnicianId(user.organizationId, user.id);
    return this.issueOrganizationAuth({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
      technicianId,
      userAgent: context?.userAgent,
    });
  }

  async resolveInvitation(invitationToken: string): Promise<ResolveInvitationPreviewResponse> {
    const token = invitationToken?.trim();
    if (!token) {
      throw new BadRequestException("Le jeton d'invitation est requis");
    }

    let invitation: InvitationResponse;
    try {
      invitation = await this.permissions.resolveInvitation(token);
    } catch (err: unknown) {
      const status = downstreamStatus(err);
      if (status === 404) throw new UnauthorizedException("Invitation introuvable");
      if (status === 409) throw new UnauthorizedException("Cette invitation a déjà été utilisée");
      throw err;
    }

    let requiresPasswordSetup = true;
    try {
      const hints = await this.users.getInvitationActivationHints(invitation.invitedUserId);
      requiresPasswordSetup = !hints.hasPassword;
    } catch {
      requiresPasswordSetup = true;
    }

    return {
      invitedEmail: invitation.invitedEmail,
      invitedName: invitation.invitedName,
      requiresPasswordSetup,
    };
  }

  private async resolveTechnicianId(
    organizationId: string,
    userId: string,
  ): Promise<string | undefined> {
    try {
      const technician = await this.technicians.findByUserId(organizationId, userId);
      return technician?.id;
    } catch {
      return undefined;
    }
  }

  /** Nom / email / statut : rechargés depuis users-service (le JWT peut être obsolète). */
  private async resolveAccountProfile(userId: string): Promise<AccountUserResponse | null> {
    try {
      return await this.users.findAccountById(userId);
    } catch {
      return null;
    }
  }

  /** Nom / email / statut : rechargés depuis users-service (le JWT peut être obsolète). */
  private async resolveUserProfile(userId: string): Promise<UserResponse | null> {
    try {
      return await this.users.findById(userId);
    } catch {
      return null;
    }
  }

  /** Le JWT peut être obsolète ; le rôle par org vit dans organization_memberships. */
  private async resolveMembershipRole(
    userId: string,
    organizationId: string,
    fallback: "admin" | "member",
  ): Promise<"admin" | "member"> {
    try {
      const memberships = await this.users.listOrganizationMemberships(userId);
      const membership = memberships.find((m) => m.organizationId === organizationId);
      if (membership?.membershipStatus === "disabled") {
        throw new UnauthorizedException("Votre accès à cette organisation a été désactivé");
      }
      if (membership?.membershipStatus === "active") {
        return membership.role;
      }
      return fallback;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      return fallback;
    }
  }

  private async mergePermissionsWithSubscription(
    organizationId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<PermissionCode[]> {
    const basePerms = await this.resolveEffectivePermissions(organizationId, userId, role);
    const minimalUser: AuthUser = {
      id: userId,
      email: "",
      organizationId,
      role,
      status: "active",
      permissions: basePerms,
    };
    try {
      const sub = await this.subscriptionsGateway.getCurrentSubscription(minimalUser);
      if (!sub.hasAccess) return [];
      return [...new Set([...basePerms, "subscription.active" as PermissionCode])];
    } catch {
      return [];
    }
  }

  private async resolveEffectivePermissions(
    organizationId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<EffectivePermissionsResponse["permissions"]> {
    try {
      const res = await this.permissions.resolveEffectivePermissions({
        organizationId,
        userId,
        role,
      });
      return res.permissions;
    } catch {
      return role === "admin" ? [...ASSIGNABLE_PERMISSION_CODES] : [];
    }
  }

  private async createUserSession(userId: string, userAgent?: string): Promise<string> {
    const res = await this.sessions.createSession(userId, { userAgent });
    return res.sessionId;
  }

  private async issueOrganizationAuth(params: {
    id: string;
    email: string;
    organizationId: string;
    role: UserRole;
    status: UserStatus;
    permissions: PermissionCode[];
    name?: string;
    technicianId?: string;
    /** Si fourni, réutilise la session (ex. switch d'organisation). */
    reuseSessionId?: string;
    userAgent?: string;
  }): Promise<AuthResponse> {
    const sid = params.reuseSessionId?.trim()
      ? params.reuseSessionId.trim()
      : await this.createUserSession(params.id, params.userAgent);

    const isFoundingAdmin = await this.resolveIsFoundingAdmin(params.organizationId, params.id);

    const authUser: AuthUser = {
      id: params.id,
      email: params.email,
      organizationId: params.organizationId,
      role: params.role,
      status: params.status,
      permissions: params.permissions,
      name: params.name,
      technicianId: params.technicianId,
      isFoundingAdmin,
    };
    const payload: JwtPayload = {
      sub: params.id,
      organizationId: params.organizationId,
      role: params.role,
      status: params.status,
      permissions: params.permissions,
      email: params.email,
      name: params.name,
      technicianId: params.technicianId,
      sid,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  private async resolveIsFoundingAdmin(organizationId: string, userId: string): Promise<boolean> {
    try {
      const foundingAdminId = await this.users.findFoundingAdminUserId(organizationId);
      return Boolean(foundingAdminId && foundingAdminId === userId);
    } catch {
      return false;
    }
  }
}
