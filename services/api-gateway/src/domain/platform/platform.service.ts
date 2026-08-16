import { Injectable } from "@nestjs/common";
import type {
  AuthResponse,
  CronRunsListResponse,
  CreatePlatformEmailTemplateBody,
  LoginBody,
  PlatformAnalyticsOverviewResponse,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformCronJobsOverviewResponse,
  PlatformDashboardResponse,
  PlatformEmailTemplate,
  PlatformEmailTemplatePreviewBody,
  PlatformEmailTemplatePreviewResponse,
  PlatformEmailTemplatePurpose,
  PlatformEmailTemplatesListResponse,
  PlatformIntegrationsListResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  PlatformOpsHealthResponse,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationsListResponse,
  PlatformProspectCreditsResponse,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectManualCreateBody,
  PlatformProspectNoteBody,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectSearchSort,
  PlatformProspectsSearchResponse,
  PlatformSendUserEmailBody,
  PlatformSendUserEmailResponse,
  PlatformUsersListResponse,
  ProspectOutreachesListResponse,
  ProspectOutreachStatus,
  StartImpersonationBody,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";
import { AbstractPlatformService } from "../ports/platform/platform.service.port";
import { AbstractPlatformAuthService } from "../ports/platform/platform-auth.service.port";
import { AbstractPlatformDashboardService } from "../ports/platform/platform-dashboard.service.port";
import { AbstractPlatformDirectoryService } from "../ports/platform/platform-directory.service.port";
import { AbstractPlatformEmailTemplatesService } from "../ports/platform/platform-email-templates.service.port";
import { AbstractPlatformIntegrationsCronsService } from "../ports/platform/platform-integrations-crons.service.port";
import { AbstractPlatformProspectsService } from "../ports/platform/platform-prospects.service.port";

/**
 * Façade BO staff : délègue aux services ciblés sous `domain/platform/`.
 */
@Injectable()
export class PlatformService extends AbstractPlatformService {
  constructor(
    private readonly auth: AbstractPlatformAuthService,
    private readonly directory: AbstractPlatformDirectoryService,
    private readonly integrationsCrons: AbstractPlatformIntegrationsCronsService,
    private readonly dashboard: AbstractPlatformDashboardService,
    private readonly prospects: AbstractPlatformProspectsService,
    private readonly emailTemplates: AbstractPlatformEmailTemplatesService,
  ) {
    super();
  }

  login(body: LoginBody): Promise<PlatformAuthResponse> {
    return this.auth.login(body);
  }

  getMe(user: PlatformAuthUser): Promise<PlatformAuthUser> {
    return this.auth.getMe(user);
  }

  listOrganizations(filters?: {
    search?: string;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse> {
    return this.directory.listOrganizations(filters);
  }

  getOrganization(organizationId: string): Promise<PlatformOrganizationDetailResponse> {
    return this.directory.getOrganization(organizationId);
  }

  staffExtendOrganizationTrial(
    organizationId: string,
  ): Promise<PlatformOrganizationDetailResponse["subscription"]> {
    return this.directory.staffExtendOrganizationTrial(organizationId);
  }

  listUsers(filters?: {
    search?: string;
    organizationId?: string;
    activeOnly?: boolean;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersListResponse> {
    return this.directory.listUsers(filters);
  }

  sendUserEmail(
    staff: PlatformAuthUser,
    userId: string,
    body: PlatformSendUserEmailBody,
  ): Promise<PlatformSendUserEmailResponse> {
    return this.directory.sendUserEmail(staff, userId, body);
  }

  startImpersonation(staff: PlatformAuthUser, body: StartImpersonationBody): Promise<AuthResponse> {
    return this.directory.startImpersonation(staff, body);
  }

  listIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformIntegrationsListResponse> {
    return this.integrationsCrons.listIntegrations(filters);
  }

  getCronJobsOverview(): Promise<PlatformCronJobsOverviewResponse> {
    return this.integrationsCrons.getCronJobsOverview();
  }

  listCronRuns(filters?: {
    jobKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CronRunsListResponse> {
    return this.integrationsCrons.listCronRuns(filters);
  }

  getAnalyticsOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse> {
    return this.dashboard.getAnalyticsOverview(days);
  }

  listLandingVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse> {
    return this.dashboard.listLandingVisits(options);
  }

  listLandingToAppVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingToAppVisitsResponse> {
    return this.dashboard.listLandingToAppVisits(options);
  }

  getDashboard(): Promise<PlatformDashboardResponse> {
    return this.dashboard.getDashboard();
  }

  getOpsHealth(): Promise<PlatformOpsHealthResponse> {
    return this.dashboard.getOpsHealth();
  }

  searchProspects(filters?: {
    page?: number;
    perPage?: number;
    departement?: string;
    codeNaf?: string;
    preset?: string;
    sort?: PlatformProspectSearchSort;
    dateCreationMin?: string;
    refresh?: boolean;
  }): Promise<PlatformProspectsSearchResponse> {
    return this.prospects.searchProspects(filters);
  }

  lookupProspectBySiret(siret: string): Promise<PlatformProspectsSearchResponse> {
    return this.prospects.lookupProspectBySiret(siret);
  }

  getProspectCredits(): Promise<PlatformProspectCreditsResponse> {
    return this.prospects.getProspectCredits();
  }

  listTrackedProspects(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse> {
    return this.prospects.listTrackedProspects(options);
  }

  sendProspectOutreach(
    staff: PlatformAuthUser,
    body: PlatformProspectOutreachBody,
  ): Promise<PlatformProspectOutreachResponse> {
    return this.prospects.sendProspectOutreach(staff, body);
  }

  markProspectEmailNotFound(
    staff: PlatformAuthUser,
    body: PlatformProspectEmailNotFoundBody,
  ): Promise<{ ok: true }> {
    return this.prospects.markProspectEmailNotFound(staff, body);
  }

  saveProspectNote(
    staff: PlatformAuthUser,
    body: PlatformProspectNoteBody,
  ): Promise<{ ok: true; comment?: string }> {
    return this.prospects.saveProspectNote(staff, body);
  }

  createManualProspect(
    staff: PlatformAuthUser,
    body: PlatformProspectManualCreateBody,
  ): Promise<{ ok: true }> {
    return this.prospects.createManualProspect(staff, body);
  }

  listEmailTemplates(
    purpose?: PlatformEmailTemplatePurpose,
  ): Promise<PlatformEmailTemplatesListResponse> {
    return this.emailTemplates.listEmailTemplates(purpose);
  }

  getEmailTemplate(id: string): Promise<PlatformEmailTemplate> {
    return this.emailTemplates.getEmailTemplate(id);
  }

  createEmailTemplate(body: CreatePlatformEmailTemplateBody): Promise<PlatformEmailTemplate> {
    return this.emailTemplates.createEmailTemplate(body);
  }

  updateEmailTemplate(
    id: string,
    body: UpdatePlatformEmailTemplateBody,
  ): Promise<PlatformEmailTemplate> {
    return this.emailTemplates.updateEmailTemplate(id, body);
  }

  deleteEmailTemplate(id: string): Promise<{ ok: true }> {
    return this.emailTemplates.deleteEmailTemplate(id);
  }

  setDefaultEmailTemplate(id: string): Promise<PlatformEmailTemplate> {
    return this.emailTemplates.setDefaultEmailTemplate(id);
  }

  previewEmailTemplate(
    body: PlatformEmailTemplatePreviewBody,
  ): Promise<PlatformEmailTemplatePreviewResponse> {
    return this.emailTemplates.previewEmailTemplate(body);
  }
}
