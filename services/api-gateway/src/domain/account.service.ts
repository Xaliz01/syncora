import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { createHmac } from "node:crypto";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  ChangePasswordBody,
  CompleteOnboardingProfileBody,
  CompleteOnboardingProfileResponse,
  CrispIdentityResponse,
  TechnicianResponse,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  UserSessionsListResponse,
} from "@planwise/shared";
import { AbstractAccountService } from "./ports/account.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

function signCrispEmail(email: string, secret: string): string {
  return createHmac("sha256", secret).update(email).digest("hex");
}

function splitDisplayName(
  name: string | undefined,
  email: string,
): { firstName: string; lastName: string } {
  const trimmed = name?.trim() || "";
  if (!trimmed) {
    const local = email.split("@")[0] || "Technicien";
    return { firstName: local, lastName: "" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

@Injectable()
export class AccountService extends AbstractAccountService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async updateName(user: AuthUser, body: UpdateUserNameBody): Promise<UserResponse> {
    return this.callUsersService<UserResponse>({
      method: "put",
      path: `/users/${user.id}/name`,
      body,
    });
  }

  async changePassword(user: AuthUser, body: ChangePasswordBody): Promise<void> {
    await this.callUsersServiceRaw({
      method: "post",
      path: `/users/${user.id}/change-password`,
      body,
    });
  }

  async getPreferences(user: AuthUser): Promise<UserPreferencesResponse> {
    const organizationId = encodeURIComponent(user.organizationId);
    return this.callUsersService<UserPreferencesResponse>({
      method: "get",
      path: `/users/${user.id}/preferences?organizationId=${organizationId}`,
    });
  }

  async updatePreferences(
    user: AuthUser,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse> {
    return this.callUsersService<UserPreferencesResponse>({
      method: "put",
      path: `/users/${user.id}/preferences`,
      body: {
        ...body,
        // Toujours scoper la réponse (et l’onboarding) à l’org courante du JWT.
        organizationId: user.organizationId,
      },
    });
  }

  async completeOnboardingProfile(
    user: AuthUser,
    body: CompleteOnboardingProfileBody,
  ): Promise<CompleteOnboardingProfileResponse> {
    if (typeof body.goesOnInterventions !== "boolean") {
      throw new BadRequestException("goesOnInterventions est requis");
    }
    await this.assertFoundingAdmin(user);

    let technicianId = await this.findTechnicianIdByUserId(user.organizationId, user.id);

    if (body.goesOnInterventions && !technicianId) {
      technicianId = await this.createAndLinkSelfTechnician(user);
    }

    const prefsRes = await this.updatePreferences(user, {
      onboardingProfileCompleted: true,
    });

    return {
      preferences: prefsRes.preferences,
      ...(technicianId ? { technicianId } : {}),
    };
  }

  getCrispIdentity(user: AuthUser): Promise<CrispIdentityResponse> {
    const secret = process.env.CRISP_IDENTITY_SECRET?.trim();
    const signature = secret ? signCrispEmail(user.email, secret) : undefined;
    return Promise.resolve({
      email: user.email,
      nickname: user.name?.trim() || user.email,
      ...(signature ? { signature } : {}),
    });
  }

  async listSessions(userId: string, currentSessionId?: string): Promise<UserSessionsListResponse> {
    const query = currentSessionId?.trim()
      ? `?currentSessionId=${encodeURIComponent(currentSessionId.trim())}`
      : "";
    return this.callUsersService<UserSessionsListResponse>({
      method: "get",
      path: `/users/${userId}/sessions${query}`,
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.callUsersServiceRaw({
      method: "delete",
      path: `/users/${userId}/sessions/${encodeURIComponent(sessionId)}`,
    });
  }

  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    await this.callUsersServiceRaw({
      method: "post",
      path: `/users/${userId}/sessions/revoke-others`,
      body: { keepSessionId },
    });
  }

  private async assertFoundingAdmin(user: AuthUser): Promise<void> {
    if (user.role !== "admin") {
      throw new ForbiddenException("Seul l'administrateur fondateur peut finaliser cet onboarding");
    }
    try {
      const res = await firstValueFrom(
        this.httpService.get<{ userId: string | null }>(
          `${SERVICE_URLS.users}/users/founding-admin`,
          {
            params: { organizationId: user.organizationId },
          },
        ),
      );
      if (res.data.userId !== user.id) {
        throw new ForbiddenException(
          "Seul l'administrateur fondateur peut finaliser cet onboarding",
        );
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new ForbiddenException("Seul l'administrateur fondateur peut finaliser cet onboarding");
    }
  }

  private async findTechnicianIdByUserId(
    organizationId: string,
    userId: string,
  ): Promise<string | undefined> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<TechnicianResponse | null>(
          `${SERVICE_URLS.technicians}/technicians/by-user/${userId}`,
          { params: { organizationId } },
        ),
      );
      return res.data?.id;
    } catch {
      return undefined;
    }
  }

  private async createAndLinkSelfTechnician(user: AuthUser): Promise<string> {
    const { firstName, lastName } = splitDisplayName(user.name, user.email);
    const created = await firstValueFrom(
      this.httpService.post<TechnicianResponse>(`${SERVICE_URLS.technicians}/technicians`, {
        organizationId: user.organizationId,
        firstName,
        lastName: lastName || firstName,
        email: user.email,
        status: "actif",
      }),
    );
    await firstValueFrom(
      this.httpService.put<TechnicianResponse>(
        `${SERVICE_URLS.technicians}/technicians/${created.data.id}/link-user`,
        { userId: user.id },
        { params: { organizationId: user.organizationId } },
      ),
    );
    return created.data.id;
  }

  private async callUsersService<T>(params: {
    method: "get" | "post" | "put" | "patch" | "delete";
    path: string;
    body?: unknown;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${SERVICE_URLS.users}${params.path}`,
          data: params.body,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private async callUsersServiceRaw(params: {
    method: "get" | "post" | "put" | "patch" | "delete";
    path: string;
    body?: unknown;
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.request({
          method: params.method,
          url: `${SERVICE_URLS.users}${params.path}`,
          data: params.body,
        }),
      );
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
      "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 404) throw new NotFoundException(message);
    throw err;
  }
}
