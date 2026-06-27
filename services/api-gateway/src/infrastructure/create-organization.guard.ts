import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import type { JwtPayload, OnboardingJwtPayload } from "@syncora/shared";
import { isOnboardingJwtPayload } from "@syncora/shared";

type CreateOrgRequest = Request & {
  user?: JwtPayload;
  onboardingUser?: OnboardingJwtPayload;
};

@Injectable()
export class CreateOrganizationGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CreateOrgRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Jeton d'authentification manquant ou invalide");
    }
    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<JwtPayload | OnboardingJwtPayload>(token);
      if (isOnboardingJwtPayload(payload)) {
        request.onboardingUser = payload;
        return true;
      }
      if (!payload.organizationId?.trim()) {
        throw new UnauthorizedException("Jeton invalide ou expiré");
      }
      if (payload.role === "admin") {
        request.user = payload;
        return true;
      }
      const perms = new Set(payload.permissions ?? []);
      if (perms.has("organizations.create")) {
        request.user = payload;
        return true;
      }
      throw new ForbiddenException("Permissions insuffisantes");
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException("Jeton invalide ou expiré");
    }
  }
}
