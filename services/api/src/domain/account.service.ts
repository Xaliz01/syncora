import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import type {
  AuthUser,
  ChangePasswordBody,
  CompleteOnboardingProfileBody,
  CompleteOnboardingProfileResponse,
  CrispIdentityResponse,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  UserPreferencesResponse,
  UserResponse,
  UserSessionsListResponse,
} from "@planwise/shared";
import { AbstractAccountService } from "./ports/account.service.port";
import { AbstractUsersService } from "./users/ports/users.service.port";
import { AbstractUserPreferencesService } from "./users/ports/user-preferences.service.port";
import { AbstractUserSessionsService } from "./users/ports/user-sessions.service.port";
import { AbstractTechniciansService } from "./technicians/ports/technicians.service.port";

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
  constructor(
    private readonly users: AbstractUsersService,
    private readonly preferences: AbstractUserPreferencesService,
    private readonly sessions: AbstractUserSessionsService,
    private readonly technicians: AbstractTechniciansService,
  ) {
    super();
  }

  async updateName(user: AuthUser, body: UpdateUserNameBody): Promise<UserResponse> {
    return this.users.updateName(user.id, body);
  }

  async changePassword(user: AuthUser, body: ChangePasswordBody): Promise<void> {
    await this.users.changePassword(user.id, body);
  }

  async getPreferences(user: AuthUser): Promise<UserPreferencesResponse> {
    return this.preferences.getPreferences(user.id, user.organizationId);
  }

  async updatePreferences(
    user: AuthUser,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse> {
    return this.preferences.updatePreferences(user.id, {
      ...body,
      organizationId: user.organizationId,
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
    const sessions = await this.sessions.listSessions(userId, currentSessionId);
    return { sessions };
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.sessions.revokeSession(userId, sessionId);
  }

  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    await this.sessions.revokeOtherSessions(userId, keepSessionId);
  }

  private async assertFoundingAdmin(user: AuthUser): Promise<void> {
    if (user.role !== "admin") {
      throw new ForbiddenException("Seul l'administrateur fondateur peut finaliser cet onboarding");
    }
    try {
      const foundingAdminId = await this.users.findFoundingAdminUserId(user.organizationId);
      if (foundingAdminId !== user.id) {
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
      const technician = await this.technicians.findByUserId(organizationId, userId);
      return technician?.id;
    } catch {
      return undefined;
    }
  }

  private async createAndLinkSelfTechnician(user: AuthUser): Promise<string> {
    const { firstName, lastName } = splitDisplayName(user.name, user.email);
    const created = await this.technicians.createTechnician({
      organizationId: user.organizationId,
      firstName,
      lastName: lastName || firstName,
      email: user.email,
      status: "actif",
    });
    await this.technicians.linkUserToTechnician(user.organizationId, created.id, user.id);
    return created.id;
  }
}
