import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AcceptInvitationBody,
  RegisterBody,
  LoginBody,
  AuthResponse,
  AuthUser,
  JwtPayload,
  EffectivePermissionsResponse,
  InvitationResponse,
  OrganizationResponse,
  UserResponse,
  ValidateCredentialsResponse
} from "@syncora/shared";
import { AVAILABLE_PERMISSION_CODES } from "@syncora/shared";
import { AbstractAuthService } from "./ports/auth.service.port";

const ORGANIZATIONS_URL =
  process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL =
  process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

@Injectable()
export class AuthService extends AbstractAuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService
  ) {
    super();
  }

  async register(body: RegisterBody): Promise<AuthResponse> {
    let org: OrganizationResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<OrganizationResponse>(`${ORGANIZATIONS_URL}/organizations`, {
          name: body.organizationName
        })
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
          role: "admin"
        })
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) throw new ConflictException("Un utilisateur avec cet email existe déjà");
      throw err;
    }

    const permissions = await this.resolveEffectivePermissions(
      user.organizationId,
      user.id,
      user.role
    );
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  async login(body: LoginBody): Promise<AuthResponse> {
    let user: ValidateCredentialsResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<ValidateCredentialsResponse>(
          `${USERS_URL}/users/validate-credentials`,
          { email: body.email, password: body.password }
        )
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw new UnauthorizedException("Email ou mot de passe incorrect");
      throw err;
    }

    const permissions = await this.resolveEffectivePermissions(
      user.organizationId,
      user.id,
      user.role
    );
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  async acceptInvitation(body: AcceptInvitationBody): Promise<AuthResponse> {
    let invitation: InvitationResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<InvitationResponse>(`${PERMISSIONS_URL}/invitations/resolve`, {
          invitationToken: body.invitationToken
        })
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
        this.httpService.post<UserResponse>(`${USERS_URL}/users/${invitation.invitedUserId}/activate`, {
          password: body.password,
          name: body.name
        })
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Utilisateur invité introuvable");
      if (status === 400) throw new UnauthorizedException("État d'activation de l'invitation invalide");
      throw err;
    }

    try {
      await firstValueFrom(
        this.httpService.post<InvitationResponse>(`${PERMISSIONS_URL}/invitations/accept`, {
          invitationToken: body.invitationToken
        })
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new UnauthorizedException("Impossible de finaliser l'invitation");
      if (status === 409) throw new UnauthorizedException("Cette invitation a déjà été utilisée");
      throw err;
    }

    const permissions = await this.resolveEffectivePermissions(
      user.organizationId,
      user.id,
      user.role
    );
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      name: user.name
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      status: user.status,
      permissions,
      email: user.email,
      name: user.name
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }

  private async resolveEffectivePermissions(
    organizationId: string,
    userId: string,
    role: "admin" | "member"
  ): Promise<EffectivePermissionsResponse["permissions"]> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<EffectivePermissionsResponse>(`${PERMISSIONS_URL}/permissions/effective`, {
          organizationId,
          userId,
          role
        })
      );
      return res.data.permissions;
    } catch {
      return role === "admin" ? [...AVAILABLE_PERMISSION_CODES] : [];
    }
  }
}
