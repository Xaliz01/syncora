import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthResponse,
  AuthUser,
  JwtPayload,
  OrganizationMembershipResponse,
  OrganizationResponse,
  PlatformAuthUser,
  PlatformIntegrationSummary,
  PlatformIntegrationsListResponse,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationSummary,
  PlatformOrganizationsListResponse,
  PlatformUserSummary,
  PlatformUsersListResponse,
  PlatformSendUserEmailBody,
  PlatformSendUserEmailResponse,
  SendEmailNotificationResponse,
  StartImpersonationBody,
  UserResponse,
} from "@planwise/shared";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { AbstractPlatformDirectoryService } from "../ports/platform/platform-directory.service.port";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { IMPERSONATION_TTL, IMPERSONATION_TTL_MS, MIN_REASON_LENGTH } from "./platform.constants";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformDirectoryService extends AbstractPlatformDirectoryService {
  private readonly logger = new Logger(PlatformDirectoryService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
    private readonly orgLookup: AbstractPlatformOrgLookupService,
  ) {
    super();
  }

  async listOrganizations(filters?: {
    search?: string;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.includeTestAccounts) params.includeTestAccounts = true;
    if (filters?.limit != null) params.limit = filters.limit;
    if (filters?.offset != null) params.offset = filters.offset;

    if (!filters?.includeTestAccounts) {
      try {
        const excludedRes = await firstValueFrom(
          this.httpService.get<string[]>(
            `${SERVICE_URLS.users}/users/platform/excluded-organization-ids`,
            { timeout: 10000 },
          ),
        );
        if (excludedRes.data.length > 0) {
          params.excludeOrganizationIds = excludedRes.data.join(",");
        }
      } catch (err: unknown) {
        this.logger.warn(
          `listOrganizations: excluded-organization-ids unavailable: ${(err as Error).message}`,
        );
      }
    }

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
        { params: { organizationId, limit: 200, includeTestAccounts: true } },
      ),
    );

    const users = await this.orgLookup.enrichUsersWithOrgNames(usersRes.data.users, {
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
    activeOnly?: boolean;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersListResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.organizationId?.trim()) params.organizationId = filters.organizationId.trim();
    if (filters?.activeOnly) params.activeOnly = true;
    if (filters?.includeTestAccounts) params.includeTestAccounts = true;
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
    const orgNames = await this.orgLookup.resolveOrganizationNames(orgIds);
    const users = await this.orgLookup.enrichUsersWithOrgNames(res.data.users, orgNames);
    return { users, total: res.data.total };
  }

  async sendUserEmail(
    staff: PlatformAuthUser,
    userId: string,
    body: PlatformSendUserEmailBody,
  ): Promise<PlatformSendUserEmailResponse> {
    const reason = body.reason?.trim() ?? "";
    if (reason.length < MIN_REASON_LENGTH) {
      throw new BadRequestException(
        `Le motif support doit contenir au moins ${MIN_REASON_LENGTH} caractères`,
      );
    }
    const subject = body.subject?.trim() ?? "";
    if (subject.length < 3) {
      throw new BadRequestException("L’objet de l’e-mail doit contenir au moins 3 caractères");
    }
    const emailBody = body.body?.trim() ?? "";
    if (emailBody.length < 10) {
      throw new BadRequestException("Le message doit contenir au moins 10 caractères");
    }

    let target: UserResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.get<UserResponse>(`${SERVICE_URLS.users}/users/${userId}`),
      );
      target = res.data;
    } catch (err: unknown) {
      this.logger.warn(`sendUserEmail: user ${userId} not found: ${(err as Error).message}`);
      throw new NotFoundException("Utilisateur introuvable");
    }

    const to = target.email?.trim().toLowerCase() ?? "";
    if (!to.includes("@")) {
      throw new BadRequestException("Cet utilisateur n’a pas d’adresse e-mail");
    }

    this.logger.log(
      `Platform staff ${staff.email} sending email to user ${userId} (${to})${
        body.templateId?.trim() ? ` template=${body.templateId.trim()}` : ""
      }: ${reason.slice(0, 120)}`,
    );

    const footer =
      body.footer?.trim() ||
      "Cet e-mail vous a été envoyé par l’équipe Planwise. Pour toute question, répondez à cet e-mail ou contactez le support.";
    const ctaLabel = body.ctaLabel?.trim() || undefined;
    const ctaUrl = body.ctaUrl?.trim() || undefined;

    let sent = false;
    let sendReason: string | undefined;
    try {
      const res = await firstValueFrom(
        this.httpService.post<SendEmailNotificationResponse>(
          `${SERVICE_URLS.notifications}/email/transactional`,
          {
            to,
            subject,
            body: emailBody,
            footer,
            ...(ctaLabel ? { ctaLabel } : {}),
            ...(ctaUrl ? { url: ctaUrl } : {}),
          },
        ),
      );
      sent = Boolean(res.data.sent);
      sendReason = res.data.reason;
      if (!sent) {
        this.logger.warn(`Platform user email not sent to ${to}: ${sendReason ?? "unknown"}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Platform user email SMTP error: ${(err as Error).message}`);
      sendReason = "Erreur d’envoi e-mail";
      sent = false;
    }

    return { sent, to, ...(sendReason ? { reason: sendReason } : {}) };
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

    const permissions = await this.orgLookup.resolvePermissions(
      organizationId,
      userId,
      membership.role,
    );
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
}
