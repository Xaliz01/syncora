import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  AuthResponse,
  AuthUser,
  JwtPayload,
  PlatformAuthUser,
  PlatformIntegrationSummary,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationSummary,
  PlatformOrganizationsListResponse,
  PlatformUsersListResponse,
  AccountUserResponse,
  PlatformSendUserEmailBody,
  PlatformSendUserEmailResponse,
  StartImpersonationBody,
} from "@planwise/shared";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { AbstractPlatformDirectoryService } from "../ports/platform/platform-directory.service.port";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";
import { AbstractEmailService } from "../notifications/ports/email.service.port";
import { AbstractImpersonationAuditService } from "../users/ports/impersonation-audit.service.port";
import { AbstractIntegrationsService } from "../integrations/ports/integrations.service.port";
import { IMPERSONATION_TTL, IMPERSONATION_TTL_MS, MIN_REASON_LENGTH } from "./platform.constants";

@Injectable()
export class PlatformDirectoryService extends AbstractPlatformDirectoryService {
  private readonly logger = new Logger(PlatformDirectoryService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
    private readonly orgLookup: AbstractPlatformOrgLookupService,
    private readonly users: AbstractUsersService,
    private readonly organizations: AbstractOrganizationsService,
    private readonly email: AbstractEmailService,
    private readonly audits: AbstractImpersonationAuditService,
    private readonly integrationsService: AbstractIntegrationsService,
  ) {
    super();
  }

  async listOrganizations(filters?: {
    search?: string;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse> {
    let excludeOrganizationIds: string[] | undefined;
    if (!filters?.includeTestAccounts) {
      try {
        const excluded = await this.users.listOrganizationIdsWithExcludedEmails();
        if (excluded.length > 0) excludeOrganizationIds = excluded;
      } catch (err: unknown) {
        this.logger.warn(
          `listOrganizations: excluded-organization-ids unavailable: ${(err as Error).message}`,
        );
      }
    }

    const res = await this.organizations.listOrganizations({
      search: filters?.search?.trim() || undefined,
      includeTestAccounts: filters?.includeTestAccounts,
      excludeOrganizationIds,
      limit: filters?.limit,
      offset: filters?.offset,
    });
    const orgs = res.organizations;
    const stats = await this.users.countUsersByOrganizationIds(orgs.map((o) => o.id));

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

    return { organizations, total: res.total };
  }

  async getOrganization(organizationId: string): Promise<PlatformOrganizationDetailResponse> {
    if (!organizationId?.trim()) {
      throw new BadRequestException("organizationId est requis");
    }
    const organization = await this.organizations.findById(organizationId);
    if (!organization) throw new NotFoundException("Organisation introuvable");

    const usersRes = await this.users.listPlatformDirectory({
      organizationId,
      limit: 200,
      includeTestAccounts: true,
    });

    const users = await this.orgLookup.enrichUsersWithOrgNames(usersRes.users, {
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
      const intRes = await this.integrationsService.listPlatformIntegrations({
        organizationId,
        limit: 20,
      });
      integrations = intRes.integrations.map((i) => ({
        ...i,
        organizationName: organization.name,
        authMethod:
          i.authMethod === "oauth" || i.authMethod === "api_token" ? i.authMethod : undefined,
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
    const res = await this.users.listPlatformDirectory({
      search: filters?.search?.trim() || undefined,
      organizationId: filters?.organizationId?.trim() || undefined,
      activeOnly: filters?.activeOnly,
      includeTestAccounts: filters?.includeTestAccounts,
      limit: filters?.limit,
      offset: filters?.offset,
    });

    const orgIds = [...new Set(res.users.map((u) => u.organizationId).filter(Boolean) as string[])];
    const orgNames = await this.orgLookup.resolveOrganizationNames(orgIds);
    const users = await this.orgLookup.enrichUsersWithOrgNames(res.users, orgNames);
    return { users, total: res.total };
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

    let target: AccountUserResponse | null;
    try {
      target = await this.users.findAccountById(userId);
    } catch (err: unknown) {
      this.logger.warn(`sendUserEmail: user ${userId} not found: ${(err as Error).message}`);
      throw new NotFoundException("Utilisateur introuvable");
    }
    if (!target) {
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
      const res = await this.email.sendTransactionalEmail(
        to,
        subject,
        emailBody,
        ctaUrl,
        ctaLabel,
        footer,
      );
      sent = Boolean(res.sent);
      sendReason = res.reason;
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

    const target = await this.users.findById(userId);
    if (!target) throw new NotFoundException("Utilisateur introuvable");

    const memberships = await this.users.listOrganizationMemberships(userId);
    const membership = memberships.find(
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

    await this.audits.createImpersonationAudit({
      impersonatorUserId: staff.id,
      impersonatorEmail: staff.email,
      targetUserId: target.id,
      targetEmail: target.email,
      organizationId,
      reason,
      expiresAt,
    });

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
