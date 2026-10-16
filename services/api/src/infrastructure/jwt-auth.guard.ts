import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import type { JwtPayload, OnboardingJwtPayload } from "@planwise/shared";
import { isOnboardingJwtPayload, SESSION_REPLACED_MESSAGE } from "@planwise/shared";
import { AbstractUserSessionsService } from "../domain/users/ports/user-sessions.service.port";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessions: AbstractUserSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Jeton d'authentification manquant ou invalide");
    }
    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.verify<JwtPayload | OnboardingJwtPayload>(token);
      if (isOnboardingJwtPayload(payload)) {
        throw new UnauthorizedException("Session d'onboarding non valide pour cette route");
      }
      if (!payload.organizationId?.trim()) {
        throw new UnauthorizedException("Jeton invalide ou expiré");
      }

      // Impersonation support : pas de contrainte de session unique.
      if (!payload.impersonatorId) {
        await this.assertActiveSession(payload);
      }

      (request as Request & { user: JwtPayload }).user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Jeton invalide ou expiré");
    }
  }

  private async assertActiveSession(payload: JwtPayload): Promise<void> {
    if (!payload.sid?.trim()) {
      throw new UnauthorizedException(SESSION_REPLACED_MESSAGE);
    }
    try {
      const res = await this.sessions.validateSession(payload.sub, payload.sid);
      if (!res.valid) {
        throw new UnauthorizedException(SESSION_REPLACED_MESSAGE);
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(SESSION_REPLACED_MESSAGE);
    }
  }
}
