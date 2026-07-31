import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
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
  TechnicianResponse,
  AccountUserResponse,
  CreateAccountResult,
  EmailVerificationRequiredResponse,
  VerifyEmailBody,
  ResendEmailVerificationBody,
  ResendEmailVerificationResponse,
  IssueEmailVerificationResult,
  SendEmailNotificationResponse,
  CreateUserSessionResponse,
  InvitationActivationHintsResponse,
  ResolveInvitationPreviewResponse,
  UserRole,
  UserStatus,
} from "@planwise/shared";
import {
  ASSIGNABLE_PERMISSION_CODES,
  getPasswordPolicyError,
  isOnboardingJwtPayload,
} from "@planwise/shared";

function buildOrganizationCreatePayload(body: CreateOrganizationBody): CreateOrganizationBody {
  return {
    name: body.name.trim(),
    siret: body.siret.trim(),
    addressLine1: body.addressLine1?.trim() || undefined,
    addressLine2: body.addressLine2?.trim() || undefined,
    postalCode: body.postalCode?.trim() || undefined,
    city: body.city?.trim() || undefined,
    country: body.country?.trim() || undefined,
  };
}
import { AbstractAuthService, type AuthRequestContext } from "./ports/auth.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";

const ORGANIZATIONS_URL = process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010";

function isNonProduction(): boolean {
  return process.env.NODE_ENV !== "production";
}

@Injectable()
export class AuthService extends AbstractAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
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
    const technicianId = await this.resolveTechnicianId(jwt.organizationId, jwt.sub);
    return {
      id: jwt.sub,
      email: profile?.email ?? jwt.email,
      organizationId: jwt.organizationId,
      role,
      status: profile?.status ?? jwt.status,
      permissions,
      name: profile?.name ?? jwt.name,
      technicianId,
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
      const res = await firstValueFrom(
        this.httpService.post<OrganizationResponse>(
          `${ORGANIZATIONS_URL}/organizations`,
          buildOrganizationCreatePayload({
            name: body.organizationName,
            siret: body.organizationSiret.trim(),
          }),
        ),
      );
      org = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) throw new ConflictException("Ce nom d'organisation est déjà utilisé");
      throw err;
    }

    let user: UserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<UserResponse>(`${USERS_URL}/users`, {
          organizationId: org.id,
          email: body.adminEmail,
          password: body.adminPassword,
          name: body.adminName,
          role: "admin",
        }),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) throw new ConflictException("Un utilisateur avec cet email existe déjà");
      throw err;
    }

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
      const res = await firstValueFrom(
        this.httpService.post<CreateAccountResult>(`${USERS_URL}/users/accounts`, {
          email: body.email,
          password: body.password,
          name: body.name,
        }),
      );
      created = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      if (status === 409) throw new ConflictException("Un utilisateur avec cet email existe déjà");
      if (status === 400) throw new BadRequestException(message ?? "Données invalides");
      throw err;
    }

    await this.sendEmailVerificationCode(created.user.email, created.emailVerificationCode);

    const response: EmailVerificationRequiredResponse = {
      status: "email_verification_required",
      email: created.user.email,
    };
    if (isNonProduction()) {
      response.debugVerificationCode = created.emailVerificationCode;
    }
    return response;
  }

  async verifyEmail(body: VerifyEmailBody): Promise<OnboardingAuthResponse> {
    let user: AccountUserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<AccountUserResponse>(`${USERS_URL}/users/accounts/verify-email`, {
          email: body.email,
          code: body.code,
        }),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
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
      const res = await firstValueFrom(
        this.httpService.post<IssueEmailVerificationResult>(
          `${USERS_URL}/users/accounts/resend-email-verification`,
          { email: body.email },
        ),
      );
      issued = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
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
      const res = await firstValueFrom(
        this.httpService.post<SendEmailNotificationResponse>(
          `${NOTIFICATIONS_URL}/email/transactional`,
          {
            to: email,
            subject: "Vérifiez votre adresse e-mail",
            body: `Bonjour,\n\nVotre code de vérification Planwise est : ${code}\n\nIl expire dans 15 minutes. Si vous n'avez pas créé de compte, ignorez cet e-mail.`,
          },
        ),
      );
      if (!res.data.sent) {
        this.logger.warn(
          `Email verification OTP not sent to ${email}: ${res.data.reason ?? "unknown"}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Failed to send email verification OTP to ${email}`, (err as Error).message);
    }
  }

  async login(
    body: LoginBody,
    context?: AuthRequestContext,
  ): Promise<AuthResponse | OnboardingAuthResponse> {
    let user: ValidateCredentialsResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<ValidateCredentialsResponse>(
          `${USERS_URL}/users/validate-credentials`,
          { email: body.email, password: body.password },
        ),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const normalized = Array.isArray(message) ? message.join(", ") : message;
      if (status === 401) throw new UnauthorizedException("Email ou mot de passe incorrect");
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
      const res = await firstValueFrom(
        this.httpService.post<OrganizationResponse>(
          `${ORGANIZATIONS_URL}/organizations`,
          buildOrganizationCreatePayload(body),
        ),
      );
      org = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) throw new ConflictException("Ce nom d'organisation est déjà utilisé");
      throw err;
    }

    await firstValueFrom(
      this.httpService.post<OrganizationMembershipResponse>(
        `${USERS_URL}/users/${userId}/organization-memberships`,
        {
          organizationId: org.id,
          role: "admin",
          membershipStatus: "active",
        },
      ),
    );

    let user: UserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.patch<UserResponse>(`${USERS_URL}/users/${userId}`, {
          organizationId: org.id,
        }),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Utilisateur introuvable");
      throw err;
    }

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
      const res = await firstValueFrom(
        this.httpService.get<OrganizationMembershipResponse[]>(
          `${USERS_URL}/users/${jwt.sub}/organization-memberships`,
        ),
      );
      memberships = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Utilisateur introuvable");
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
      const res = await firstValueFrom(
        this.httpService.patch<UserResponse>(`${USERS_URL}/users/${jwt.sub}`, {
          organizationId: targetId,
        }),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Utilisateur introuvable");
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
      await firstValueFrom(
        this.httpService.post(`${USERS_URL}/users/${jwt.sub}/sessions/revoke`, {
          sessionId: jwt.sid,
        }),
      );
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
      const res = await firstValueFrom(
        this.httpService.post<InvitationResponse>(`${PERMISSIONS_URL}/invitations/resolve`, {
          invitationToken: body.invitationToken,
        }),
      );
      invitation = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Invitation introuvable");
      if (status === 409) throw new UnauthorizedException("Cette invitation a déjà été utilisée");
      throw err;
    }

    let user: UserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<UserResponse>(
          `${USERS_URL}/users/${invitation.invitedUserId}/activate`,
          {
            password: body.password,
            name: body.name,
            organizationId: invitation.organizationId,
          },
        ),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      if (status === 404) throw new UnauthorizedException("Utilisateur invité introuvable");
      if (status === 401) {
        throw new UnauthorizedException(message ?? "Mot de passe incorrect");
      }
      if (status === 400)
        throw new UnauthorizedException(message ?? "État d'activation de l'invitation invalide");
      throw err;
    }

    try {
      await firstValueFrom(
        this.httpService.post<InvitationResponse>(`${PERMISSIONS_URL}/invitations/accept`, {
          invitationToken: body.invitationToken,
        }),
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
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
      const res = await firstValueFrom(
        this.httpService.post<InvitationResponse>(`${PERMISSIONS_URL}/invitations/resolve`, {
          invitationToken: token,
        }),
      );
      invitation = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Invitation introuvable");
      if (status === 409) throw new UnauthorizedException("Cette invitation a déjà été utilisée");
      throw err;
    }

    let requiresPasswordSetup = true;
    try {
      const res = await firstValueFrom(
        this.httpService.get<InvitationActivationHintsResponse>(
          `${USERS_URL}/users/${invitation.invitedUserId}/invitation-activation-hints`,
        ),
      );
      requiresPasswordSetup = !res.data.hasPassword;
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
      const res = await firstValueFrom(
        this.httpService.get<TechnicianResponse | null>(
          `${TECHNICIANS_URL}/technicians/by-user/${userId}`,
          { params: { organizationId } },
        ),
      );
      return res.data?.id;
    } catch {
      return undefined;
    }
  }

  /** Nom / email / statut : rechargés depuis users-service (le JWT peut être obsolète). */
  private async resolveAccountProfile(userId: string): Promise<AccountUserResponse | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<AccountUserResponse>(`${USERS_URL}/users/accounts/${userId}`),
      );
      return res.data;
    } catch {
      return null;
    }
  }

  /** Nom / email / statut : rechargés depuis users-service (le JWT peut être obsolète). */
  private async resolveUserProfile(userId: string): Promise<UserResponse | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<UserResponse>(`${USERS_URL}/users/${userId}`),
      );
      return res.data;
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
      const res = await firstValueFrom(
        this.httpService.get<OrganizationMembershipResponse[]>(
          `${USERS_URL}/users/${userId}/organization-memberships`,
        ),
      );
      const membership = res.data.find((m) => m.organizationId === organizationId);
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
      const res = await firstValueFrom(
        this.httpService.post<EffectivePermissionsResponse>(
          `${PERMISSIONS_URL}/permissions/effective`,
          {
            organizationId,
            userId,
            role,
          },
        ),
      );
      return res.data.permissions;
    } catch {
      return role === "admin" ? [...ASSIGNABLE_PERMISSION_CODES] : [];
    }
  }

  private async createUserSession(userId: string, userAgent?: string): Promise<string> {
    const res = await firstValueFrom(
      this.httpService.post<CreateUserSessionResponse>(`${USERS_URL}/users/${userId}/sessions`, {
        userAgent,
      }),
    );
    return res.data.sessionId;
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

    const authUser: AuthUser = {
      id: params.id,
      email: params.email,
      organizationId: params.organizationId,
      role: params.role,
      status: params.status,
      permissions: params.permissions,
      name: params.name,
      technicianId: params.technicianId,
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
}
