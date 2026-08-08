import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
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
  PlatformProspectCreditsResponse,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectNoteBody,
  PlatformProspectManualCreateBody,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectSummary,
  PlatformProspectsSearchResponse,
  PlatformProspectSearchSort,
  PlatformUserSummary,
  PlatformAnalyticsOverviewResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  PlatformUsersListResponse,
  ProspectOutreachesBySirensResponse,
  ProspectOutreachesListResponse,
  ProspectOutreachStatus,
  SendEmailNotificationResponse,
  StartImpersonationBody,
  UserResponse,
  ValidateCredentialsResponse,
} from "@planwise/shared";
import {
  ASSIGNABLE_PERMISSION_CODES,
  getPlatformProspectNafCodes,
  isPlatformStaffEmail,
  PLATFORM_CRON_JOBS,
} from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "./ports/analytics.gateway.service.port";
import { AbstractPlatformService } from "./ports/platform.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { buildPappersSearchCacheKey, PappersSearchCache } from "./pappers-search-cache";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";
/** Recherche / suivi-jetons sont sur l’API v2 (la v3 ne couvre que la surveillance). */
const PAPPERS_API_URL = process.env.PAPPERS_API_URL ?? "https://api.pappers.fr/v2";
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL ?? "https://planwise.fr";

const IMPERSONATION_TTL = "45m";
const IMPERSONATION_TTL_MS = 45 * 60 * 1000;
const MIN_REASON_LENGTH = 10;
const PROSPECT_OUTREACH_SUBJECT =
  "Planwise — un CRM simple et abordable pour démarrer votre activité";
const PROSPECT_OUTREACH_FOOTER =
  "Cet e-mail est une présentation de Planwise destinée aux entreprises récemment créées. Répondez STOP pour ne plus être contacté.";

/** Compare dates Pappers (YYYY-MM-DD ou ISO) — plus récent d’abord. */
function compareProspectCreatedAtDesc(a?: string, b?: string): number {
  const ta = a ? Date.parse(a.includes("T") ? a : `${a}T00:00:00Z`) : 0;
  const tb = b ? Date.parse(b.includes("T") ? b : `${b}T00:00:00Z`) : 0;
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}

@Injectable()
export class PlatformService extends AbstractPlatformService {
  private readonly logger = new Logger(PlatformService.name);
  private readonly pappersSearchCache = new PappersSearchCache();

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
    private readonly analyticsGateway: AbstractAnalyticsGatewayService,
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
        `${SERVICE_URLS.organizations}/organizations`,
        { params },
      ),
    );
    const orgs = res.data.organizations;
    const statsRes = await firstValueFrom(
      this.httpService.post<Record<string, { userCount: number; lastUserLoginAt?: string }>>(
        `${SERVICE_URLS.users}/users/platform/organization-stats`,
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
          `${SERVICE_URLS.organizations}/organizations/${organizationId}`,
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
        `${SERVICE_URLS.users}/users/platform/directory`,
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
        billingOpen: sub.billingOpen,
        canExtendTrial: sub.canExtendTrial,
        trialExtensionCount: sub.trialExtensionCount,
        maxTrialExtensions: sub.maxTrialExtensions,
      };
    } catch {
      subscription = undefined;
    }

    let integrations: PlatformIntegrationSummary[] = [];
    try {
      const intRes = await firstValueFrom(
        this.httpService.get<PlatformIntegrationsListResponse>(
          `${SERVICE_URLS.integrations}/platform/integrations`,
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

  async staffExtendOrganizationTrial(
    organizationId: string,
  ): Promise<PlatformOrganizationDetailResponse["subscription"]> {
    if (!organizationId?.trim()) {
      throw new BadRequestException("organizationId est requis");
    }
    const sub = await this.subscriptionsGateway.staffExtendTrial(organizationId.trim());
    return {
      status: sub.status,
      planName: sub.planName,
      hasAccess: sub.hasAccess,
      trialEndsAt: sub.trialEndsAt ?? undefined,
      billingOpen: sub.billingOpen,
      canExtendTrial: sub.canExtendTrial,
      trialExtensionCount: sub.trialExtensionCount,
      maxTrialExtensions: sub.maxTrialExtensions,
    };
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
        `${SERVICE_URLS.users}/users/platform/directory`,
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
        this.httpService.get<UserResponse>(`${SERVICE_URLS.users}/users/${userId}`),
      );
      target = res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new NotFoundException("Utilisateur introuvable");
      throw err;
    }

    const membershipsRes = await firstValueFrom(
      this.httpService.get<OrganizationMembershipResponse[]>(
        `${SERVICE_URLS.users}/users/${userId}/organization-memberships`,
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
      this.httpService.post(`${SERVICE_URLS.users}/users/platform/impersonation-audits`, {
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
        `${SERVICE_URLS.integrations}/platform/integrations`,
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

    // Sans filtre : fusionne les runs de chaque service (triés par startedAt desc).
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    // Assez d’éléments par source pour couvrir la page demandée après merge.
    const fetchLimit = Math.min(offset + limit, 200);

    const batches = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        try {
          const res = await firstValueFrom(
            this.httpService.get<CronRunsListResponse>(
              `${this.cronServiceBaseUrl(def.service)}/platform/cron-runs`,
              { params: { jobKey: def.jobKey, limit: fetchLimit, offset: 0 } },
            ),
          );
          return { runs: res.data.runs, total: res.data.total };
        } catch {
          return { runs: [] as CronRunResponse[], total: 0 };
        }
      }),
    );

    const total = batches.reduce((sum, b) => sum + b.total, 0);
    const runs = batches
      .flatMap((b) => b.runs)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(offset, offset + limit);

    return { runs, total };
  }

  getAnalyticsOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse> {
    return this.analyticsGateway.getOverview(days);
  }

  listLandingVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse> {
    return this.analyticsGateway.listLandingVisits(options);
  }

  listLandingToAppVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingToAppVisitsResponse> {
    return this.analyticsGateway.listLandingToAppVisits(options);
  }

  async searchProspects(filters?: {
    page?: number;
    perPage?: number;
    departement?: string;
    codeNaf?: string;
    preset?: string;
    sort?: PlatformProspectSearchSort;
    dateCreationMin?: string;
    refresh?: boolean;
  }): Promise<PlatformProspectsSearchResponse> {
    const apiKey = this.requirePappersApiKey();
    const page = Math.max(filters?.page ?? 1, 1);
    const perPage = Math.min(Math.max(filters?.perPage ?? 20, 1), 50);
    const sort: PlatformProspectSearchSort =
      filters?.sort === "created_at_desc" ? "created_at_desc" : "default";
    const codeNaf =
      filters?.codeNaf?.trim() || getPlatformProspectNafCodes(filters?.preset).join(",");
    const dateCreationMin =
      this.parsePappersDateCreationMin(filters?.dateCreationMin) ??
      this.formatPappersDate(this.daysAgo(365));
    const departement = filters?.departement?.trim() || "";

    const cacheKey = buildPappersSearchCacheKey({
      preset: filters?.preset,
      codeNaf: filters?.codeNaf,
      departement,
      page,
      perPage,
      sort,
      dateCreationMin,
    });

    if (!filters?.refresh) {
      const cached = this.pappersSearchCache.get(cacheKey);
      if (cached) {
        const credits = await this.fetchPappersCredits(apiKey).catch(() => undefined);
        return {
          ...cached,
          fromCache: true,
          ...(credits != null ? { creditsRemaining: credits } : {}),
        };
      }
    }

    const params: Record<string, string | number> = {
      api_token: apiKey,
      code_naf: codeNaf,
      date_creation_min: dateCreationMin,
      entreprise_cessee: "false",
      page,
      par_page: perPage,
    };
    if (departement) params.departement = departement;

    let pappers: PappersRechercheResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.get<PappersRechercheResponse>(`${PAPPERS_API_URL}/recherche`, {
          params,
          timeout: 20_000,
        }),
      );
      pappers = res.data;
    } catch (err: unknown) {
      const axiosErr = err as {
        message?: string;
        response?: {
          status?: number;
          data?: { detail?: string; title?: string; message?: string };
        };
      };
      const detail =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.title ||
        axiosErr.message;
      this.logger.warn(`Pappers recherche failed (${axiosErr.response?.status ?? "?"}): ${detail}`);
      throw new ServiceUnavailableException(
        "Impossible de récupérer les prospects Pappers. Vérifiez la clé API et les crédits.",
      );
    }

    const rawResults = pappers.resultats ?? pappers.entreprises ?? [];
    const mapped = rawResults.map((row) => this.mapPappersEntreprise(row));
    const sirens = mapped.map((r) => r.siren).filter(Boolean);
    const outreachBySiren = await this.loadOutreachBySirens(sirens);

    let results: PlatformProspectSummary[] = mapped.map((r) => {
      const prior = outreachBySiren.get(r.siren);
      return {
        ...r,
        alreadyContacted: Boolean(prior && prior.status === "sent"),
        emailNotFound: Boolean(prior && prior.status === "email_not_found"),
        lastContactedAt: prior?.sentAt,
        ...(prior?.comment ? { comment: prior.comment } : {}),
      };
    });

    if (sort === "created_at_desc") {
      results = [...results].sort((a, b) => compareProspectCreatedAtDesc(a.createdAt, b.createdAt));
    }

    const credits = await this.fetchPappersCredits(apiKey).catch(() => undefined);

    const response: PlatformProspectsSearchResponse = {
      results,
      total: pappers.total ?? results.length,
      page: pappers.page ?? page,
      perPage,
      sort,
      fromCache: false,
      ...(credits != null ? { creditsRemaining: credits } : {}),
    };
    this.pappersSearchCache.set(cacheKey, response);
    return response;
  }

  async lookupProspectBySiret(raw: string): Promise<PlatformProspectsSearchResponse> {
    const apiKey = this.requirePappersApiKey();
    const id = raw?.trim().replace(/\s/g, "") ?? "";
    const isSiret = /^\d{14}$/.test(id);
    const isSiren = /^\d{9}$/.test(id);
    if (!isSiret && !isSiren) {
      throw new BadRequestException("SIRET (14 chiffres) ou SIREN (9 chiffres) requis");
    }

    let row: PappersEntrepriseRow;
    try {
      const res = await firstValueFrom(
        this.httpService.get<PappersEntrepriseRow>(`${PAPPERS_API_URL}/entreprise`, {
          params: {
            api_token: apiKey,
            ...(isSiret ? { siret: id } : { siren: id }),
          },
          timeout: 20_000,
        }),
      );
      row = res.data;
    } catch (err: unknown) {
      const axiosErr = err as {
        message?: string;
        response?: {
          status?: number;
          data?: { detail?: string; title?: string; message?: string };
        };
      };
      const status = axiosErr.response?.status;
      if (status === 404) {
        throw new NotFoundException(
          isSiret ? "Aucune entreprise pour ce SIRET" : "Aucune entreprise pour ce SIREN",
        );
      }
      const detail =
        axiosErr.response?.data?.detail ||
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.title ||
        axiosErr.message;
      this.logger.warn(`Pappers entreprise failed (${status ?? "?"}): ${detail}`);
      throw new ServiceUnavailableException(
        "Impossible de récupérer la fiche Pappers. Vérifiez la clé API et les crédits.",
      );
    }

    if (!row?.siren && !row?.siret) {
      throw new NotFoundException(
        isSiret ? "Aucune entreprise pour ce SIRET" : "Aucune entreprise pour ce SIREN",
      );
    }

    const mapped = this.mapPappersEntreprise(row);
    if (isSiret && !mapped.siret) {
      mapped.siret = id;
    }
    const outreachBySiren = await this.loadOutreachBySirens([mapped.siren].filter(Boolean));
    const prior = outreachBySiren.get(mapped.siren);
    const result: PlatformProspectSummary = {
      ...mapped,
      alreadyContacted: Boolean(prior && prior.status === "sent"),
      emailNotFound: Boolean(prior && prior.status === "email_not_found"),
      lastContactedAt: prior?.sentAt,
      ...(prior?.comment ? { comment: prior.comment } : {}),
    };

    const credits = await this.fetchPappersCredits(apiKey).catch(() => undefined);
    return {
      results: [result],
      total: 1,
      page: 1,
      perPage: 1,
      fromCache: false,
      ...(credits != null ? { creditsRemaining: credits } : {}),
    };
  }

  async getProspectCredits(): Promise<PlatformProspectCreditsResponse> {
    const apiKey = process.env.PAPPERS_API_KEY?.trim();
    if (!apiKey) return { configured: false };
    try {
      const creditsRemaining = await this.fetchPappersCredits(apiKey);
      return { configured: true, creditsRemaining };
    } catch {
      return { configured: true };
    }
  }

  async listTrackedProspects(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<ProspectOutreachesListResponse>(
          `${SERVICE_URLS.users}/users/platform/prospect-outreaches`,
          {
            params: {
              ...(options?.limit != null ? { limit: options.limit } : {}),
              ...(options?.offset != null ? { offset: options.offset } : {}),
              ...(options?.status ? { status: options.status } : {}),
              ...(options?.search?.trim() ? { search: options.search.trim() } : {}),
            },
            timeout: 10_000,
          },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.warn(`Failed to list tracked prospects: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible de charger les prospects suivis");
    }
  }

  async sendProspectOutreach(
    staff: PlatformAuthUser,
    body: PlatformProspectOutreachBody,
  ): Promise<PlatformProspectOutreachResponse> {
    const siren = body.siren?.trim().replace(/\s/g, "") ?? "";
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const toEmail = body.toEmail?.trim().toLowerCase() ?? "";
    if (!toEmail.includes("@")) {
      throw new BadRequestException("E-mail destinataire requis");
    }
    const companyName = body.companyName?.trim() || `SIREN ${siren}`;

    if (!body.force) {
      const existing = await this.loadOutreachBySirens([siren]);
      const prior = existing.get(siren);
      if (prior?.status === "sent") {
        throw new ConflictException("Cette entreprise a déjà été contactée");
      }
    }

    const contact = body.contactName?.trim();
    const greeting = contact ? `Bonjour ${contact},` : "Bonjour,";
    const landingUrl = APP_PUBLIC_URL.replace(/\/$/, "") || "https://planwise.fr";
    const emailBody = `${greeting}

Vous avez créé récemment votre entreprise : c’est le bon moment pour structurer votre activité sans vous ruiner en outils.

Planwise est un CRM pensé pour les indépendants, artisans et TPE. Il est actuellement en beta : simple, abordable, et adapté à une structure qui démarre. Pendant toute la beta, Planwise reste **gratuit**. Ensuite, l’abonnement Essentiel sera à **9,99 €** par mois. En rejoignant la beta, vous bénéficierez d’avantages réservés aux premiers utilisateurs.

Découvrez Planwise : ${landingUrl}

Si vous n’êtes pas intéressé, répondez STOP à cet e-mail pour ne plus être contacté.

L’équipe Planwise
Éditeur basé à Landerneau (29)`;

    let sent = false;
    let reason: string | undefined;
    try {
      const res = await firstValueFrom(
        this.httpService.post<SendEmailNotificationResponse>(
          `${SERVICE_URLS.notifications}/email/transactional`,
          {
            to: toEmail,
            subject: PROSPECT_OUTREACH_SUBJECT,
            body: emailBody,
            url: "/",
            ctaLabel: "Découvrir Planwise",
            footer: PROSPECT_OUTREACH_FOOTER,
          },
        ),
      );
      sent = Boolean(res.data.sent);
      reason = res.data.reason;
      if (!sent) {
        this.logger.warn(`Prospect outreach not sent to ${toEmail}: ${reason ?? "unknown"}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Prospect outreach SMTP error: ${(err as Error).message}`);
      reason = "Erreur d’envoi e-mail";
      sent = false;
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${SERVICE_URLS.users}/users/platform/prospect-outreaches`, {
          siren,
          companyName,
          email: toEmail,
          sentByUserId: staff.id,
          sentByEmail: staff.email,
          subject: PROSPECT_OUTREACH_SUBJECT,
          status: sent ? "sent" : "failed",
        }),
      );
    } catch (err: unknown) {
      this.logger.warn(`Failed to log prospect outreach: ${(err as Error).message}`);
    }

    return { sent, ...(reason ? { reason } : {}) };
  }

  async markProspectEmailNotFound(
    staff: PlatformAuthUser,
    body: PlatformProspectEmailNotFoundBody,
  ): Promise<{ ok: true }> {
    const siren = body.siren?.trim().replace(/\s/g, "") ?? "";
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const companyName = body.companyName?.trim() || `SIREN ${siren}`;

    const existing = await this.loadOutreachBySirens([siren]);
    const prior = existing.get(siren);
    if (prior?.status === "sent") {
      throw new ConflictException("Cette entreprise a déjà été contactée");
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${SERVICE_URLS.users}/users/platform/prospect-outreaches`, {
          siren,
          companyName,
          email: "",
          sentByUserId: staff.id,
          sentByEmail: staff.email,
          subject: "Email non trouvé",
          status: "email_not_found",
        }),
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        throw new ConflictException("Cette entreprise a déjà été contactée");
      }
      this.logger.warn(`Failed to mark prospect email not found: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible d’enregistrer le statut");
    }
    return { ok: true };
  }

  async saveProspectNote(
    staff: PlatformAuthUser,
    body: PlatformProspectNoteBody,
  ): Promise<{ ok: true; comment?: string }> {
    const siren = body.siren?.trim().replace(/\s/g, "") ?? "";
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide");
    }
    const companyName = body.companyName?.trim() || `SIREN ${siren}`;
    const comment = typeof body.comment === "string" ? body.comment : "";

    try {
      const res = await firstValueFrom(
        this.httpService.post<{ comment?: string }>(
          `${SERVICE_URLS.users}/users/platform/prospect-outreaches/comment`,
          {
            siren,
            companyName,
            comment,
            sentByUserId: staff.id,
            sentByEmail: staff.email,
          },
        ),
      );
      return { ok: true, ...(res.data.comment ? { comment: res.data.comment } : {}) };
    } catch (err: unknown) {
      this.logger.warn(`Failed to save prospect note: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible d’enregistrer le commentaire");
    }
  }

  async createManualProspect(
    staff: PlatformAuthUser,
    body: PlatformProspectManualCreateBody,
  ): Promise<{ ok: true }> {
    const digits = (body.siren?.trim() ?? "").replace(/\D/g, "");
    const siren = digits.length === 14 ? digits.slice(0, 9) : digits;
    if (!/^\d{9}$/.test(siren)) {
      throw new BadRequestException("SIREN invalide (9 chiffres, ou SIRET 14 chiffres)");
    }
    const companyName = body.companyName?.trim() ?? "";
    if (!companyName) {
      throw new BadRequestException("Nom de l’entreprise requis");
    }
    const email = body.email?.trim().toLowerCase() ?? "";
    if (email && !email.includes("@")) {
      throw new BadRequestException("E-mail invalide");
    }
    const comment = typeof body.comment === "string" ? body.comment : undefined;

    const existing = await this.loadOutreachBySirens([siren]);
    if (existing.has(siren)) {
      throw new ConflictException("Ce prospect est déjà suivi");
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${SERVICE_URLS.users}/users/platform/prospect-outreaches`, {
          siren,
          companyName,
          email,
          sentByUserId: staff.id,
          sentByEmail: staff.email,
          subject: "Ajout manuel",
          status: "noted",
          ...(comment !== undefined ? { comment } : {}),
        }),
      );
    } catch (err: unknown) {
      this.logger.warn(`Failed to create manual prospect: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible d’ajouter le prospect");
    }
    return { ok: true };
  }

  private requirePappersApiKey(): string {
    const key = process.env.PAPPERS_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        "PAPPERS_API_KEY non configurée. Ajoutez la clé API Pappers côté api-gateway.",
      );
    }
    return key;
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d;
  }

  /** Format Pappers JJ-MM-AAAA. */
  private formatPappersDate(date: Date): string {
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  /**
   * Accepte `YYYY-MM-DD` (input HTML date) ou `JJ-MM-AAAA` (Pappers).
   * Retourne le format Pappers ou undefined si invalide.
   */
  private parsePappersDateCreationMin(raw?: string): string | undefined {
    const value = raw?.trim();
    if (!value) return undefined;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) {
      const [, yyyy, mm, dd] = iso;
      const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
      if (
        date.getUTCFullYear() !== Number(yyyy) ||
        date.getUTCMonth() !== Number(mm) - 1 ||
        date.getUTCDate() !== Number(dd)
      ) {
        throw new BadRequestException("dateCreationMin invalide");
      }
      return `${dd}-${mm}-${yyyy}`;
    }
    const fr = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
    if (fr) {
      const [, dd, mm, yyyy] = fr;
      const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
      if (
        date.getUTCFullYear() !== Number(yyyy) ||
        date.getUTCMonth() !== Number(mm) - 1 ||
        date.getUTCDate() !== Number(dd)
      ) {
        throw new BadRequestException("dateCreationMin invalide");
      }
      return `${dd}-${mm}-${yyyy}`;
    }
    throw new BadRequestException("dateCreationMin invalide (attendu YYYY-MM-DD)");
  }

  private mapPappersEntreprise(row: PappersEntrepriseRow): PlatformProspectSummary {
    const siren = String(row.siren ?? "").replace(/\s/g, "");
    const siege = row.siege;
    const dirigeants = (row.dirigeants ?? [])
      .map((d) => {
        const name = [d.prenom, d.prenoms, d.nom].filter(Boolean).join(" ").trim();
        return name || undefined;
      })
      .filter((n): n is string => Boolean(n));
    return {
      siren,
      siret: row.siret ? String(row.siret) : siege?.siret ? String(siege.siret) : undefined,
      name: row.nom_entreprise || row.denomination || row.nom || `SIREN ${siren}`,
      naf: row.code_naf || row.naf || undefined,
      nafLabel: row.libelle_code_naf || row.libelle_naf || undefined,
      createdAt: row.date_creation || undefined,
      city: siege?.ville || row.ville || undefined,
      postalCode: siege?.code_postal || row.code_postal || undefined,
      dirigeants: dirigeants.length ? dirigeants : undefined,
      website: row.domaine || row.site_internet || row.website || undefined,
      alreadyContacted: false,
      emailNotFound: false,
    };
  }

  private async loadOutreachBySirens(
    sirens: string[],
  ): Promise<Map<string, { status: string; sentAt: string; comment?: string }>> {
    const map = new Map<string, { status: string; sentAt: string; comment?: string }>();
    if (sirens.length === 0) return map;
    try {
      const res = await firstValueFrom(
        this.httpService.get<ProspectOutreachesBySirensResponse>(
          `${SERVICE_URLS.users}/users/platform/prospect-outreaches`,
          { params: { sirens: sirens.join(",") } },
        ),
      );
      for (const o of res.data.outreaches ?? []) {
        map.set(o.siren, {
          status: o.status,
          sentAt: o.sentAt,
          ...(o.comment ? { comment: o.comment } : {}),
        });
      }
    } catch {
      /* best-effort */
    }
    return map;
  }

  private async fetchPappersCredits(apiKey: string): Promise<number | undefined> {
    const res = await firstValueFrom(
      this.httpService.get<{
        jetons?: number;
        credits?: number;
        solde?: number;
        jetons_pay_as_you_go_restants?: number;
        jetons_abonnement?: number;
        jetons_abonnement_utilises?: number;
      }>(`${PAPPERS_API_URL}/suivi-jetons`, {
        params: { api_token: apiKey },
        timeout: 10_000,
      }),
    );
    return this.parsePappersCredits(res.data);
  }

  private parsePappersCredits(data: {
    jetons?: number;
    credits?: number;
    solde?: number;
    jetons_pay_as_you_go_restants?: number;
    jetons_abonnement?: number;
    jetons_abonnement_utilises?: number;
  }): number | undefined {
    if (typeof data.jetons === "number") return data.jetons;
    if (typeof data.credits === "number") return data.credits;
    if (typeof data.solde === "number") return data.solde;
    const payg = data.jetons_pay_as_you_go_restants;
    const abo = data.jetons_abonnement;
    const used = data.jetons_abonnement_utilises ?? 0;
    if (typeof payg === "number" || typeof abo === "number") {
      const aboRestant = typeof abo === "number" ? Math.max(0, abo - used) : 0;
      return (typeof payg === "number" ? payg : 0) + aboRestant;
    }
    return undefined;
  }

  private cronServiceBaseUrl(service: (typeof PLATFORM_CRON_JOBS)[number]["service"]): string {
    switch (service) {
      case "integrations-service":
        return SERVICE_URLS.integrations;
      case "notifications-service":
        return SERVICE_URLS.notifications;
      case "organizations-service":
        return SERVICE_URLS.organizations;
      case "cases-service":
        return SERVICE_URLS.cases;
      default:
        return SERVICE_URLS.organizations;
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
            this.httpService.get<OrganizationResponse>(
              `${SERVICE_URLS.organizations}/organizations/${id}`,
            ),
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
          `${SERVICE_URLS.permissions}/permissions/effective`,
          { organizationId, userId, role },
        ),
      );
      return res.data.permissions;
    } catch {
      return role === "admin" ? [...ASSIGNABLE_PERMISSION_CODES] : [];
    }
  }
}

type PappersDirigeant = {
  nom?: string;
  prenom?: string;
  prenoms?: string;
};

type PappersEntrepriseRow = {
  siren?: string | number;
  siret?: string | number;
  nom_entreprise?: string;
  denomination?: string;
  nom?: string;
  code_naf?: string;
  naf?: string;
  libelle_code_naf?: string;
  libelle_naf?: string;
  date_creation?: string;
  ville?: string;
  code_postal?: string;
  domaine?: string;
  site_internet?: string;
  website?: string;
  siege?: {
    siret?: string | number;
    ville?: string;
    code_postal?: string;
  };
  dirigeants?: PappersDirigeant[];
};

type PappersRechercheResponse = {
  resultats?: PappersEntrepriseRow[];
  entreprises?: PappersEntrepriseRow[];
  total?: number;
  page?: number;
};
