import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthResponse,
  AuthUser,
  CronRunResponse,
  CronRunsListResponse,
  EffectivePermissionsResponse,
  JwtPayload,
  LoginBody,
  OrganizationMembershipResponse,
  OrganizationResponse,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformCronJobsOverviewResponse,
  PlatformIntegrationSummary,
  PlatformIntegrationsListResponse,
  PlatformJwtPayload,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationSummary,
  PlatformOrganizationsListResponse,
  PlatformUserSummary,
  PlatformUsersListResponse,
  StartImpersonationBody,
  UserResponse,
  ValidateCredentialsResponse,
} from "@planwise/shared";
import {
  ASSIGNABLE_PERMISSION_CODES,
  isPlatformStaffEmail,
  PLATFORM_CRON_JOBS,
} from "@planwise/shared";
import { AbstractPlatformService } from "./ports/platform.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";

const ORGANIZATIONS_URL = process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";
const INTEGRATIONS_URL = process.env.INTEGRATIONS_SERVICE_URL ?? "http://localhost:3013";
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010";

const IMPERSONATION_TTL = "45m";
const IMPERSONATION_TTL_MS = 45 * 60 * 1000;
const MIN_REASON_LENGTH = 10;

@Injectable()
export class PlatformService extends AbstractPlatformService {
  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
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
          `${USERS_URL}/users/validate-credentials`,
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

  async listOrganizations(filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse> {
    const params: Record<string, string | number> = {};
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.limit != null) params.limit = filters.limit;
    if (filters?.offset != null) params.offset = filters.offset;

    const res = await firstValueFrom(
      this.httpService.get<{ organizations: OrganizationResponse[]; total: number }>(
        `${ORGANIZATIONS_URL}/organizations`,
        { params },
      ),
    );
    const orgs = res.data.organizations;
    const statsRes = await firstValueFrom(
      this.httpService.post<Record<string, { userCount: number; lastUserLoginAt?: string }>>(
        `${USERS_URL}/users/platform/organization-stats`,
        { organizationIds: orgs.map((o) => o.id) },
      ),
    );
    const stats = statsRes.data;

    const organizations: PlatformOrganizationSummary[] = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      siret: o.siret,
      email: o.email,
      city: o.city,
      createdAt: o.createdAt,
      userCount: stats[o.id]?.userCount ?? 0,
      lastUserLoginAt: stats[o.id]?.lastUserLoginAt,
    }));

    return { organizations, total: res.data.total };
  }

  async getOrganization(organizationId: string): Promise<PlatformOrganizationDetailResponse> {
    if (!organizationId?.trim()) {
      throw new BadRequestException("organizationId est requis");
    }
    let organization: OrganizationResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.get<OrganizationResponse>(
          `${ORGANIZATIONS_URL}/organizations/${organizationId}`,
        ),
      );
      organization = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new NotFoundException("Organisation introuvable");
      throw err;
    }

    const usersRes = await firstValueFrom(
      this.httpService.get<{ users: PlatformUserSummary[]; total: number }>(
        `${USERS_URL}/users/platform/directory`,
        { params: { organizationId, limit: 200 } },
      ),
    );

    const users = await this.enrichUsersWithOrgNames(usersRes.data.users, {
      [organization.id]: organization.name,
    });

    let subscription: PlatformOrganizationDetailResponse["subscription"];
    try {
      const sub = await this.subscriptionsGateway.getCurrentSubscription({
        id: "platform",
        email: "platform@planwise.fr",
        organizationId,
        role: "admin",
        status: "active",
        permissions: [],
      });
      subscription = {
        status: sub.status,
        planName: sub.planName,
        hasAccess: sub.hasAccess,
        trialEndsAt: sub.trialEndsAt ?? undefined,
      };
    } catch {
      subscription = undefined;
    }

    let integrations: PlatformIntegrationSummary[] = [];
    try {
      const intRes = await firstValueFrom(
        this.httpService.get<PlatformIntegrationsListResponse>(
          `${INTEGRATIONS_URL}/platform/integrations`,
          { params: { organizationId, limit: 20 } },
        ),
      );
      integrations = intRes.data.integrations.map((i) => ({
        ...i,
        organizationName: organization.name,
      }));
    } catch {
      integrations = [];
    }

    return { organization, users, subscription, integrations };
  }

  async listUsers(filters?: {
    search?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersListResponse> {
    const params: Record<string, string | number> = {};
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.organizationId?.trim()) params.organizationId = filters.organizationId.trim();
    if (filters?.limit != null) params.limit = filters.limit;
    if (filters?.offset != null) params.offset = filters.offset;

    const res = await firstValueFrom(
      this.httpService.get<{ users: PlatformUserSummary[]; total: number }>(
        `${USERS_URL}/users/platform/directory`,
        { params },
      ),
    );

    const orgIds = [
      ...new Set(res.data.users.map((u) => u.organizationId).filter(Boolean) as string[]),
    ];
    const orgNames = await this.resolveOrganizationNames(orgIds);
    const users = await this.enrichUsersWithOrgNames(res.data.users, orgNames);
    return { users, total: res.data.total };
  }

  async startImpersonation(
    staff: PlatformAuthUser,
    body: StartImpersonationBody,
  ): Promise<AuthResponse> {
    const reason = body.reason?.trim() ?? "";
    if (reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException(
        `Le motif support doit contenir au moins ${MIN_REASON_LENGTH} caractères`,
      );
    }
    const userId = body.userId?.trim();
    const organizationId = body.organizationId?.trim();
    if (!userId || !organizationId) {
      throw new BadRequestException("userId et organizationId sont requis");
    }

    let target: UserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.get<UserResponse>(`${USERS_URL}/users/${userId}`),
      );
      target = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new NotFoundException("Utilisateur introuvable");
      throw err;
    }

    const membershipsRes = await firstValueFrom(
      this.httpService.get<OrganizationMembershipResponse[]>(
        `${USERS_URL}/users/${userId}/organization-memberships`,
      ),
    );
    const membership = membershipsRes.data.find(
      (m) => m.organizationId === organizationId && m.membershipStatus === "active",
    );
    if (!membership) {
      throw new BadRequestException("Cet utilisateur n’appartient pas à cette organisation");
    }

    const permissions = await this.resolvePermissions(organizationId, userId, membership.role);
    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS).toISOString();

    await firstValueFrom(
      this.httpService.post(`${USERS_URL}/users/platform/impersonation-audits`, {
        impersonatorUserId: staff.id,
        impersonatorEmail: staff.email,
        targetUserId: target.id,
        targetEmail: target.email,
        organizationId,
        reason,
        expiresAt,
      }),
    );

    const authUser: AuthUser = {
      id: target.id,
      email: target.email,
      organizationId,
      role: membership.role,
      status: target.status,
      permissions,
      name: target.name,
      impersonatorId: staff.id,
      impersonatorEmail: staff.email,
    };
    const payload: JwtPayload = {
      sub: target.id,
      organizationId,
      role: membership.role,
      status: target.status,
      permissions,
      email: target.email,
      name: target.name,
      impersonatorId: staff.id,
      impersonatorEmail: staff.email,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: IMPERSONATION_TTL });
    return { accessToken, user: authUser };
  }

  async listIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformIntegrationsListResponse> {
    const params: Record<string, string | number> = {};
    if (filters?.provider?.trim()) params.provider = filters.provider.trim();
    if (filters?.organizationId?.trim()) params.organizationId = filters.organizationId.trim();
    if (filters?.limit != null) params.limit = filters.limit;
    if (filters?.offset != null) params.offset = filters.offset;

    const res = await firstValueFrom(
      this.httpService.get<PlatformIntegrationsListResponse>(
        `${INTEGRATIONS_URL}/platform/integrations`,
        { params },
      ),
    );

    const orgIds = [...new Set(res.data.integrations.map((i) => i.organizationId))];
    const orgNames = await this.resolveOrganizationNames(orgIds);
    return {
      total: res.data.total,
      integrations: res.data.integrations.map((i) => ({
        ...i,
        organizationName: orgNames[i.organizationId],
      })),
    };
  }

  async getCronJobsOverview(): Promise<PlatformCronJobsOverviewResponse> {
    const jobs = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        const baseUrl = this.cronServiceBaseUrl(def.service);
        let lastRun: CronRunResponse | undefined;
        try {
          const res = await firstValueFrom(
            this.httpService.get<CronRunResponse | "">(`${baseUrl}/platform/cron-runs/latest`, {
              params: { jobKey: def.jobKey },
            }),
          );
          lastRun = res.data && typeof res.data === "object" ? res.data : undefined;
        } catch {
          lastRun = undefined;
        }
        return { ...def, lastRun };
      }),
    );
    return { jobs };
  }

  async listCronRuns(filters?: {
    jobKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CronRunsListResponse> {
    const jobKey = filters?.jobKey?.trim();
    if (jobKey) {
      const def = PLATFORM_CRON_JOBS.find((j) => j.jobKey === jobKey);
      if (!def) {
        throw new BadRequestException(`Job inconnu : ${jobKey}`);
      }
      const res = await firstValueFrom(
        this.httpService.get<CronRunsListResponse>(
          `${this.cronServiceBaseUrl(def.service)}/platform/cron-runs`,
          {
            params: {
              jobKey,
              limit: filters?.limit,
              offset: filters?.offset,
            },
          },
        ),
      );
      return res.data;
    }

    // Sans filtre : fusionne les derniers runs de chaque service.
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const batches = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        try {
          const res = await firstValueFrom(
            this.httpService.get<CronRunsListResponse>(
              `${this.cronServiceBaseUrl(def.service)}/platform/cron-runs`,
              { params: { jobKey: def.jobKey, limit } },
            ),
          );
          return res.data.runs;
        } catch {
          return [] as CronRunResponse[];
        }
      }),
    );
    const runs = batches
      .flat()
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
    return { runs, total: runs.length };
  }

  private cronServiceBaseUrl(service: (typeof PLATFORM_CRON_JOBS)[number]["service"]): string {
    switch (service) {
      case "integrations-service":
        return INTEGRATIONS_URL;
      case "notifications-service":
        return NOTIFICATIONS_URL;
      case "organizations-service":
        return ORGANIZATIONS_URL;
      default:
        return ORGANIZATIONS_URL;
    }
  }

  private async enrichUsersWithOrgNames(
    users: PlatformUserSummary[],
    orgNames: Record<string, string>,
  ): Promise<PlatformUserSummary[]> {
    return users.map((u) => ({
      ...u,
      organizationName: u.organizationId ? orgNames[u.organizationId] : undefined,
    }));
  }

  private async resolveOrganizationNames(ids: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await firstValueFrom(
            this.httpService.get<OrganizationResponse>(`${ORGANIZATIONS_URL}/organizations/${id}`),
          );
          out[id] = res.data.name;
        } catch {
          /* ignore */
        }
      }),
    );
    return out;
  }

  private async resolvePermissions(
    organizationId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<JwtPayload["permissions"]> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<EffectivePermissionsResponse>(
          `${PERMISSIONS_URL}/permissions/effective`,
          { organizationId, userId, role },
        ),
      );
      return res.data.permissions;
    } catch {
      return role === "admin" ? [...ASSIGNABLE_PERMISSION_CODES] : [];
    }
  }
}
