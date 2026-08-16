import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import type {
  AuthUser,
  CaseTemplateResponse,
  InjectTrialTestDataResponse,
  InterventionTypeResponse,
  InterventionTypesListResponse,
  PermissionProfileResponse,
  PurgeTrialTestDataResponse,
  TechnicianResponse,
  TrialTestDataStatusResponse,
  UpdateOrganizationTrialTestDataBody,
} from "@planwise/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { AbstractTrialTestDataService } from "./ports/trial-test-data.service.port";
import {
  buildDemoAgences,
  buildDemoArticles,
  buildDemoCaseTemplates,
  buildDemoCases,
  buildDemoCustomers,
  buildDemoInterventions,
  buildDemoInterventionTypes,
  buildDemoPermissionProfiles,
  buildDemoTeams,
  buildDemoTechnicians,
  buildDemoVehicles,
  runInBatches,
  TRIAL_DEMO_COUNTS,
} from "./trial-test-data-seed";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

const INJECT_BATCH_SIZE = 10;

@Injectable()
export class TrialTestDataService extends AbstractTrialTestDataService {
  private readonly logger = new Logger(TrialTestDataService.name);
  private readonly injectionInFlight = new Set<string>();

  constructor(
    private readonly httpService: HttpService,
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
  ) {
    super();
  }

  async getStatus(user: AuthUser): Promise<TrialTestDataStatusResponse> {
    const res = await firstValueFrom(
      this.httpService.get<TrialTestDataStatusResponse>(
        `${SERVICE_URLS.organizations}/organizations/${user.organizationId}/trial-test-data/status`,
      ),
    );
    return res.data;
  }

  async inject(user: AuthUser): Promise<InjectTrialTestDataResponse> {
    await this.assertTrialing(user);
    const current = await this.getStatus(user);
    if (current.status === "injecting") {
      throw new ConflictException("Une injection de données de démonstration est déjà en cours.");
    }
    if (current.status === "ready") {
      throw new ConflictException(
        "Des données de démonstration sont déjà présentes. Supprimez-les avant d’en réinjecter.",
      );
    }

    const orgId = user.organizationId;
    if (this.injectionInFlight.has(orgId)) {
      return { accepted: true };
    }
    this.injectionInFlight.add(orgId);
    await this.patchTrialTestData(orgId, { status: "injecting", errorMessage: null });

    void this.runInjection(user).finally(() => {
      this.injectionInFlight.delete(orgId);
    });

    return { accepted: true };
  }

  async purge(user: AuthUser): Promise<PurgeTrialTestDataResponse> {
    return this.purgeOrganization(user.organizationId);
  }

  async purgeOrganization(organizationId: string): Promise<PurgeTrialTestDataResponse> {
    await this.purgeAllServices(organizationId);
    await this.patchTrialTestData(organizationId, {
      status: "none",
      injectedAt: null,
      errorMessage: null,
    });
    return { purged: true };
  }

  private async runInjection(user: AuthUser): Promise<void> {
    const organizationId = user.organizationId;
    const orgSuffix = organizationId.slice(-4).toUpperCase();
    try {
      await this.purgeAllServices(organizationId);
      this.logger.log(
        `Injecting trial demo data for ${organizationId} (${JSON.stringify(TRIAL_DEMO_COUNTS)})`,
      );

      const agences = await runInBatches(
        buildDemoAgences(organizationId),
        INJECT_BATCH_SIZE,
        (body) =>
          this.post<{ id: string }>(SERVICE_URLS.technicians, organizationId, "/agences", body),
      );
      const agenceIds = agences.map((a) => a.id);

      const technicians = await runInBatches(
        buildDemoTechnicians(organizationId),
        INJECT_BATCH_SIZE,
        (body) =>
          this.post<{ id: string }>(SERVICE_URLS.technicians, organizationId, "/technicians", body),
      );
      const technicianIds = technicians.map((t) => t.id);

      const teams = await runInBatches(
        buildDemoTeams(organizationId, agenceIds, technicianIds),
        INJECT_BATCH_SIZE,
        (body) =>
          this.post<{ id: string }>(SERVICE_URLS.technicians, organizationId, "/teams", body),
      );
      const teamIds = teams.map((t) => t.id);

      const vehicles = await runInBatches(
        buildDemoVehicles(organizationId, orgSuffix),
        INJECT_BATCH_SIZE,
        (body) => this.post<{ id: string }>(SERVICE_URLS.fleet, organizationId, "/vehicles", body),
      );
      await runInBatches(vehicles, INJECT_BATCH_SIZE, (vehicle, i) =>
        this.scopedHttp.request({
          baseUrl: SERVICE_URLS.fleet,
          organizationId,
          method: "put",
          path: `/vehicles/${vehicle.id}/assign-team`,
          body: { teamId: teamIds[i % teamIds.length]! },
          errorLabel: "Fleet service error",
        }),
      );

      await runInBatches(buildDemoPermissionProfiles(organizationId), INJECT_BATCH_SIZE, (body) =>
        this.post<PermissionProfileResponse>(
          SERVICE_URLS.permissions,
          organizationId,
          "/profiles",
          body,
        ),
      );

      const templates = await runInBatches(
        buildDemoCaseTemplates(organizationId),
        INJECT_BATCH_SIZE,
        (body) =>
          this.post<CaseTemplateResponse>(SERVICE_URLS.cases, organizationId, "/templates", body),
      );
      const templateIds = templates.map((t) => t.id);

      const interventionTypeIds = await this.ensureDemoInterventionTypeIds(organizationId);

      const customers = await runInBatches(
        buildDemoCustomers(organizationId),
        INJECT_BATCH_SIZE,
        (body) =>
          this.post<{ id: string }>(SERVICE_URLS.customers, organizationId, "/customers", body),
      );
      const customerIds = customers.map((c) => c.id);

      await runInBatches(buildDemoArticles(organizationId, orgSuffix), INJECT_BATCH_SIZE, (body) =>
        this.post(SERVICE_URLS.stock, organizationId, "/articles", body),
      );

      const caseAssignee = {
        userId: user.id,
        name: user.name?.trim() || user.email,
      };
      const caseSeeds = buildDemoCases(organizationId, customerIds, templateIds, caseAssignee);
      const createdCases = await runInBatches(caseSeeds, INJECT_BATCH_SIZE, async (seed) => {
        const created = await this.post<{ id: string }>(
          SERVICE_URLS.cases,
          organizationId,
          "/cases",
          seed.create,
        );
        if (seed.status !== "draft") {
          await this.scopedHttp.request({
            baseUrl: SERVICE_URLS.cases,
            organizationId,
            method: "patch",
            path: `/cases/${created.id}`,
            body: { organizationId, status: seed.status },
            errorLabel: "Cases service error",
          });
        }
        return created;
      });
      const caseIds = createdCases.map((c) => c.id);

      const assigneeTechnicianId = await this.ensureUserTechnician(user);

      await runInBatches(
        buildDemoInterventions(organizationId, caseIds, teamIds, {
          assigneeTechnicianId,
          userCaseCount: Math.min(
            TRIAL_DEMO_COUNTS.userAssignedCases,
            caseIds.length,
            TRIAL_DEMO_COUNTS.interventions,
          ),
          interventionTypeIds,
        }),
        INJECT_BATCH_SIZE,
        (body) => this.post(SERVICE_URLS.cases, organizationId, "/interventions", body),
      );

      await this.patchTrialTestData(organizationId, {
        status: "ready",
        injectedAt: new Date().toISOString(),
        errorMessage: null,
      });
      this.logger.log(`Trial demo data ready for ${organizationId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l’injection des données de démo";
      this.logger.error(`Trial test data injection failed for ${organizationId}`, err);
      await this.purgeAllServices(organizationId).catch(() => undefined);
      await this.patchTrialTestData(organizationId, {
        status: "failed",
        errorMessage: message,
      });
    }
  }

  private post<T>(baseUrl: string, organizationId: string, path: string, body: object): Promise<T> {
    return this.scopedHttp.request<T>({
      baseUrl,
      organizationId,
      method: "post",
      path,
      body,
      errorLabel: `${baseUrl} error`,
    });
  }

  /**
   * Réutilise Pose / SAV s’ils existent déjà (ex. import catalogue), sinon les crée en démo.
   */
  private async ensureDemoInterventionTypeIds(organizationId: string): Promise<string[]> {
    const existing = await this.scopedHttp.request<InterventionTypesListResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId,
      method: "get",
      path: "/intervention-types",
      query: { organizationId },
      errorLabel: "Cases service error",
    });
    const byName = new Map(
      (existing.types ?? []).map((t) => [t.name.trim().toLocaleLowerCase("fr"), t] as const),
    );
    const ids: string[] = [];
    for (const body of buildDemoInterventionTypes(organizationId)) {
      const key = body.name.trim().toLocaleLowerCase("fr");
      const found = byName.get(key);
      if (found) {
        ids.push(found.id);
        continue;
      }
      const created = await this.post<InterventionTypeResponse>(
        SERVICE_URLS.cases,
        organizationId,
        "/intervention-types",
        body,
      );
      byName.set(key, created);
      ids.push(created.id);
    }
    return ids;
  }

  /**
   * Les interventions s’assignent à un technicien flotte (pas à un userId nu).
   * Crée et lie un technicien pour l’injecteur s’il n’en a pas encore.
   */
  private async ensureUserTechnician(user: AuthUser): Promise<string> {
    const organizationId = user.organizationId;
    const existing = await this.scopedHttp.request<TechnicianResponse | null>({
      baseUrl: SERVICE_URLS.technicians,
      organizationId,
      method: "get",
      path: `/technicians/by-user/${user.id}`,
      validateResponseScope: false,
      errorLabel: "Technicians service error",
    });
    if (existing?.id) return existing.id;

    const nameParts = (user.name?.trim() || user.email).split(/\s+/);
    const firstName = nameParts[0] || "Admin";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const created = await this.post<TechnicianResponse>(
      SERVICE_URLS.technicians,
      organizationId,
      "/technicians",
      {
        organizationId,
        firstName,
        lastName,
        email: user.email,
        status: "actif",
      },
    );
    await this.scopedHttp.request({
      baseUrl: SERVICE_URLS.technicians,
      organizationId,
      method: "put",
      path: `/technicians/${created.id}/link-user`,
      body: { userId: user.id },
      errorLabel: "Technicians service error",
    });
    return created.id;
  }

  private async assertTrialing(user: AuthUser): Promise<void> {
    const sub = await this.subscriptionsGateway.getCurrentSubscription(user);
    if (!sub.hasAccess) {
      throw new ForbiddenException("Abonnement inactif ou expiré.");
    }
    if (sub.status !== "trialing") {
      throw new BadRequestException(
        "Les données de démonstration ne sont disponibles que pendant la période d’essai gratuit.",
      );
    }
  }

  private async patchTrialTestData(
    organizationId: string,
    body: UpdateOrganizationTrialTestDataBody,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService.patch(
        `${SERVICE_URLS.organizations}/organizations/${organizationId}/trial-test-data`,
        body,
      ),
    );
  }

  private async purgeAllServices(organizationId: string): Promise<void> {
    const query = { organizationId };
    const urls = [
      { url: SERVICE_URLS.cases, label: "cases" },
      { url: SERVICE_URLS.stock, label: "stock" },
      { url: SERVICE_URLS.fleet, label: "fleet" },
      { url: SERVICE_URLS.technicians, label: "technicians" },
      { url: SERVICE_URLS.customers, label: "customers" },
      { url: SERVICE_URLS.permissions, label: "permissions" },
      { url: SERVICE_URLS.integrations, label: "integrations" },
    ];
    for (const { url, label } of urls) {
      try {
        await firstValueFrom(this.httpService.delete(`${url}/test-data`, { params: query }));
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 404) continue;
        this.logger.warn(`Purge test data: ${label} service returned an error`, err);
      }
    }
  }
}
