import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  LoginBody,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformJwtPayload,
  ValidateCredentialsResponse,
} from "@planwise/shared";
import { isPlatformStaffEmail } from "@planwise/shared";
import { AbstractPlatformAuthService } from "../ports/platform/platform-auth.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";

@Injectable()
export class PlatformAuthService extends AbstractPlatformAuthService {
  constructor(
    private readonly users: AbstractUsersService,
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
      const result = await this.users.validateCredentials(email, body.password);
      if (!result) throw new UnauthorizedException("Email ou mot de passe incorrect");
      user = result;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
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
