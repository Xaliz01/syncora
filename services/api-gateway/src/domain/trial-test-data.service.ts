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
  PermissionProfileResponse,
  PurgeTrialTestDataResponse,
  TrialTestDataStatusResponse,
  UpdateOrganizationTrialTestDataBody,
} from "@syncora/shared";
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
  buildDemoPermissionProfiles,
  buildDemoTeams,
  buildDemoTechnicians,
  buildDemoVehicles,
  runInBatches,
  TRIAL_DEMO_COUNTS,
} from "./trial-test-data-seed";

const ORGANIZATIONS_URL = process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";
const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";
const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";
const STOCK_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3007";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

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
        `${ORGANIZATIONS_URL}/organizations/${user.organizationId}/trial-test-data/status`,
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
        (body) => this.post<{ id: string }>(TECHNICIANS_URL, organizationId, "/agences", body),
      );
      const agenceIds = agences.map((a) => a.id);

      const technicians = await runInBatches(
        buildDemoTechnicians(organizationId),
        INJECT_BATCH_SIZE,
        (body) => this.post<{ id: string }>(TECHNICIANS_URL, organizationId, "/technicians", body),
      );
      const technicianIds = technicians.map((t) => t.id);

      const teams = await runInBatches(
        buildDemoTeams(organizationId, agenceIds, technicianIds),
        INJECT_BATCH_SIZE,
        (body) => this.post<{ id: string }>(TECHNICIANS_URL, organizationId, "/teams", body),
      );
      const teamIds = teams.map((t) => t.id);

      const vehicles = await runInBatches(
        buildDemoVehicles(organizationId, orgSuffix),
        INJECT_BATCH_SIZE,
        (body) => this.post<{ id: string }>(FLEET_URL, organizationId, "/vehicles", body),
      );
      await runInBatches(vehicles, INJECT_BATCH_SIZE, (vehicle, i) =>
        this.scopedHttp.request({
          baseUrl: FLEET_URL,
          organizationId,
          method: "put",
          path: `/vehicles/${vehicle.id}/assign-team`,
          body: { teamId: teamIds[i % teamIds.length]! },
          errorLabel: "Fleet service error",
        }),
      );

      await runInBatches(buildDemoPermissionProfiles(organizationId), INJECT_BATCH_SIZE, (body) =>
        this.post<PermissionProfileResponse>(PERMISSIONS_URL, organizationId, "/profiles", body),
      );

      const templates = await runInBatches(
        buildDemoCaseTemplates(organizationId),
        INJECT_BATCH_SIZE,
        (body) => this.post<CaseTemplateResponse>(CASES_URL, organizationId, "/templates", body),
      );
      const templateIds = templates.map((t) => t.id);

      const customers = await runInBatches(
        buildDemoCustomers(organizationId),
        INJECT_BATCH_SIZE,
        (body) => this.post<{ id: string }>(CUSTOMERS_URL, organizationId, "/customers", body),
      );
      const customerIds = customers.map((c) => c.id);

      await runInBatches(buildDemoArticles(organizationId, orgSuffix), INJECT_BATCH_SIZE, (body) =>
        this.post(STOCK_URL, organizationId, "/articles", body),
      );

      const caseAssignee = {
        userId: user.id,
        name: user.name?.trim() || user.email,
      };
      const caseSeeds = buildDemoCases(organizationId, customerIds, templateIds, caseAssignee);
      const createdCases = await runInBatches(caseSeeds, INJECT_BATCH_SIZE, async (seed) => {
        const created = await this.post<{ id: string }>(
          CASES_URL,
          organizationId,
          "/cases",
          seed.create,
        );
        if (seed.status !== "draft") {
          await this.scopedHttp.request({
            baseUrl: CASES_URL,
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

      await runInBatches(
        buildDemoInterventions(organizationId, caseIds, teamIds, {
          assigneeUserId: caseAssignee.userId,
          userCaseCount: Math.min(
            TRIAL_DEMO_COUNTS.userAssignedCases,
            caseIds.length,
            TRIAL_DEMO_COUNTS.interventions,
          ),
        }),
        INJECT_BATCH_SIZE,
        (body) => this.post(CASES_URL, organizationId, "/interventions", body),
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
        `${ORGANIZATIONS_URL}/organizations/${organizationId}/trial-test-data`,
        body,
      ),
    );
  }

  private async purgeAllServices(organizationId: string): Promise<void> {
    const query = { organizationId };
    const urls = [
      { url: CASES_URL, label: "cases" },
      { url: STOCK_URL, label: "stock" },
      { url: FLEET_URL, label: "fleet" },
      { url: TECHNICIANS_URL, label: "technicians" },
      { url: CUSTOMERS_URL, label: "customers" },
      { url: PERMISSIONS_URL, label: "permissions" },
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
