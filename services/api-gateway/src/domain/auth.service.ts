import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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
} from "@planwise/shared";
import { ASSIGNABLE_PERMISSION_CODES, isOnboardingJwtPayload } from "@planwise/shared";

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
import { AbstractAuthService } from "./ports/auth.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";

const ORGANIZATIONS_URL = process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";

@Injectable()
export class AuthService extends AbstractAuthService {
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

  async register(body: RegisterBody): Promise<AuthResponse> {
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
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  async registerAccount(body: RegisterAccountBody): Promise<OnboardingAuthResponse> {
    let user: AccountUserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<AccountUserResponse>(`${USERS_URL}/users/accounts`, {
          email: body.email,
          password: body.password,
          name: body.name,
        }),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) throw new ConflictException("Un utilisateur avec cet email existe déjà");
      throw err;
    }

    return this.issueOnboardingAuth(user);
  }

  async getOnboardingUser(jwt: OnboardingJwtPayload): Promise<OnboardingUser> {
    const account = await this.resolveAccountProfile(jwt.sub);
    if (!account) {
      throw new UnauthorizedException("Utilisateur introuvable");
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

  async login(body: LoginBody): Promise<AuthResponse | OnboardingAuthResponse> {
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
      if (status === 401) throw new UnauthorizedException("Email ou mot de passe incorrect");
      throw err;
    }

    if (!user.organizationId?.trim() || !user.role) {
      return this.issueOnboardingAuth({
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
      });
    }

    const permissions = await this.mergePermissionsWithSubscription(
      user.organizationId,
      user.id,
      user.role,
    );
    const technicianId = await this.resolveTechnicianId(user.organizationId, user.id);
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
      technicianId,
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name,
      technicianId,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  async createOrganization(
    body: CreateOrganizationBody,
    actor: JwtPayload | OnboardingJwtPayload,
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
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
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
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role,
      status: user.status,
      permissions,
      name: user.name,
      technicianId,
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name,
      technicianId,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  async acceptInvitation(body: AcceptInvitationBody): Promise<AuthResponse> {
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
          },
        ),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Utilisateur invité introuvable");
      if (status === 400)
        throw new UnauthorizedException("État d'activation de l'invitation invalide");
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
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name,
      technicianId,
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name,
      technicianId,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
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
      const active = res.data.find(
        (m) => m.organizationId === organizationId && m.membershipStatus === "active",
      );
      return active?.role ?? fallback;
    } catch {
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
}
