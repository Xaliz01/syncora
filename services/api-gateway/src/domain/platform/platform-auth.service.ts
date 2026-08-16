import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  LoginBody,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformJwtPayload,
  ValidateCredentialsResponse,
} from "@planwise/shared";
import { isPlatformStaffEmail } from "@planwise/shared";
import { AbstractPlatformAuthService } from "../ports/platform/platform-auth.service.port";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformAuthService extends AbstractPlatformAuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async login(body: LoginBody): Promise<PlatformAuthResponse> {
    const email = body.email?.trim() ?? "";
    if (!email || !body.password) {
      throw new BadRequestException("Email et mot de passe requis");
    }
    if (!isPlatformStaffEmail(email)) {
      throw new ForbiddenException("Accès backoffice réservé au staff Planwise");
    }

    let user: ValidateCredentialsResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<ValidateCredentialsResponse>(
          `${SERVICE_URLS.users}/users/validate-credentials`,
          { email, password: body.password },
        ),
      );
      user = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw new UnauthorizedException("Email ou mot de passe incorrect");
      throw err;
    }

    if (!isPlatformStaffEmail(user.email)) {
      throw new ForbiddenException("Accès backoffice réservé au staff Planwise");
    }

    const payload: PlatformJwtPayload = {
      kind: "platform",
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: "8h" });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async getMe(user: PlatformAuthUser): Promise<PlatformAuthUser> {
    return user;
  }
}
