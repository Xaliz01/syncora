import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import type { JwtPayload, OnboardingJwtPayload } from "@planwise/shared";
import { isOnboardingJwtPayload } from "@planwise/shared";

type AuthOrOnboardingRequest = Request & {
  user?: JwtPayload;
  onboardingUser?: OnboardingJwtPayload;
};

@Injectable()
export class AuthOrOnboardingGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthOrOnboardingRequest>();
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
      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Jeton invalide ou expiré");
    }
  }
}
