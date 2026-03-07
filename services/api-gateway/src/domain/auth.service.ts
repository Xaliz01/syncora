import { Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  RegisterBody,
  LoginBody,
  AuthResponse,
  AuthUser,
  JwtPayload,
  OrganizationResponse,
  UserResponse,
  ValidateCredentialsResponse
} from "@syncora/shared";

const ORGANIZATIONS_URL =
  process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService
  ) {}

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
      if (status === 409) throw new ConflictException("Organization name already taken");
      throw err;
    }

    let user: UserResponse | ValidateCredentialsResponse;
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
      if (status === 409) throw new ConflictException("User with this email already exists");
      throw err;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
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
      if (status === 401) throw new UnauthorizedException("Invalid email or password");
      throw err;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name
    };
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      name: user.name
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: authUser };
  }
}
