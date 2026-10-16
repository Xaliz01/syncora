import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import type { PlatformAuthUser, PlatformJwtPayload } from "@planwise/shared";
import { isPlatformJwtPayload } from "@planwise/shared";

@Injectable()
export class PlatformJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Jeton d'authentification manquant ou invalide");
    }
    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<PlatformJwtPayload>(token);
      if (!isPlatformJwtPayload(payload)) {
        throw new UnauthorizedException("Session plateforme requise");
      }
      (request as Request & { platformUser: PlatformJwtPayload }).platformUser = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Jeton invalide ou expiré");
    }
  }
}

export const CurrentPlatformUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformAuthUser => {
    const request = ctx.switchToHttp().getRequest<{ platformUser: PlatformJwtPayload }>();
    const p = request.platformUser;
    return {
      id: p.sub,
      email: p.email,
      name: p.name,
    };
  },
);
