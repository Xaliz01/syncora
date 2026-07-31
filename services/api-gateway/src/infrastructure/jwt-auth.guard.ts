import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { firstValueFrom } from "rxjs";
import type {
  JwtPayload,
  OnboardingJwtPayload,
  ValidateUserSessionResponse,
} from "@planwise/shared";
import { isOnboardingJwtPayload, SESSION_REPLACED_MESSAGE } from "@planwise/shared";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
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
      const res = await firstValueFrom(
        this.httpService.post<ValidateUserSessionResponse>(`${USERS_URL}/users/validate-session`, {
          userId: payload.sub,
          sessionId: payload.sid,
        }),
      );
      if (!res.data.valid) {
        throw new UnauthorizedException(SESSION_REPLACED_MESSAGE);
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(SESSION_REPLACED_MESSAGE);
    }
  }
}
