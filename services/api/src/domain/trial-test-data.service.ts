import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import type {
  AuthUser,
  InjectTrialTestDataResponse,
  PurgeTrialTestDataResponse,
  TrialTestDataStatusResponse,
  UpdateOrganizationTrialTestDataBody,
} from "@planwise/shared";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { AbstractTrialTestDataService } from "./ports/trial-test-data.service.port";
import { AbstractOrganizationsService } from "./organizations/ports/organizations.service.port";
import { AbstractAgencesService } from "./technicians/ports/agences.service.port";
import { AbstractTechniciansService } from "./technicians/ports/technicians.service.port";
import { AbstractTeamsService } from "./technicians/ports/teams.service.port";
import { TestDataPurgeService } from "./technicians/test-data-purge.service";
import { AbstractFleetService } from "./fleet/ports/fleet.service.port";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";
import { AbstractCaseTemplatesService } from "./cases/ports/case-templates.service.port";
import { AbstractInterventionTypesService } from "./cases/ports/intervention-types.service.port";
import { AbstractCasesService } from "./cases/ports/cases.service.port";
import { AbstractInterventionsService } from "./cases/ports/interventions.service.port";
import { AbstractCustomersService } from "./customers/ports/customers.service.port";
import { AbstractOrderGiversService } from "./customers/ports/order-givers.service.port";
import { AbstractArticleStockService } from "./stock/ports/article-stock.service.port";
import { AbstractPrestationService } from "./stock/ports/prestation.service.port";
import { AbstractStockLocationService } from "./stock/ports/stock-location.service.port";
import { AbstractIntegrationsService } from "./integrations/ports/integrations.service.port";
import {
  buildDemoAgences,
  buildDemoArticles,
  buildDemoCaseTemplates,
  buildDemoCases,
  buildDemoCustomers,
  demoCustomerDisplayName,
  buildDemoInterventions,
  buildDemoInterventionTypes,
  buildDemoPermissionProfiles,
  buildDemoTeams,
  buildDemoTechnicians,
  buildDemoVehicles,
  runInBatches,
  TRIAL_DEMO_COUNTS,
} from "./trial-test-data-seed";

const INJECT_BATCH_SIZE = 10;

@Injectable()
export class TrialTestDataService extends AbstractTrialTestDataService {
  private readonly logger = new Logger(TrialTestDataService.name);
  private readonly injectionInFlight = new Set<string>();

  constructor(
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
    private readonly organizations: AbstractOrganizationsService,
    private readonly agences: AbstractAgencesService,
    private readonly technicians: AbstractTechniciansService,
    private readonly teams: AbstractTeamsService,
    private readonly technicianPurge: TestDataPurgeService,
    private readonly fleet: AbstractFleetService,
    private readonly permissions: AbstractPermissionsService,
    private readonly caseTemplates: AbstractCaseTemplatesService,
    private readonly interventionTypes: AbstractInterventionTypesService,
    private readonly cases: AbstractCasesService,
    private readonly interventions: AbstractInterventionsService,
    private readonly customers: AbstractCustomersService,
    private readonly orderGivers: AbstractOrderGiversService,
    private readonly articles: AbstractArticleStockService,
    private readonly prestations: AbstractPrestationService,
    private readonly stockLocations: AbstractStockLocationService,
    private readonly integrations: AbstractIntegrationsService,
  ) {
    super();
  }

  async getStatus(user: AuthUser): Promise<TrialTestDataStatusResponse> {
    return this.organizations.getTrialTestDataStatus(user.organizationId);
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
        (body) => this.agences.createAgence(body),
      );
      const agenceIds = agences.map((a) => a.id);

      const technicians = await runInBatches(
        buildDemoTechnicians(organizationId),
        INJECT_BATCH_SIZE,
        (body) => this.technicians.createTechnician(body),
      );
      const technicianIds = technicians.map((t) => t.id);

      const teams = await runInBatches(
        buildDemoTeams(organizationId, agenceIds, technicianIds),
        INJECT_BATCH_SIZE,
        (body) => this.teams.createTeam(body),
      );
      const teamIds = teams.map((t) => t.id);

      const vehicles = await runInBatches(
        buildDemoVehicles(organizationId, orgSuffix),
        INJECT_BATCH_SIZE,
        (body) => this.fleet.createVehicle(body),
      );
      await runInBatches(vehicles, INJECT_BATCH_SIZE, (vehicle, i) =>
        this.fleet.assignTeam(organizationId, vehicle.id, teamIds[i % teamIds.length]!),
      );

      await runInBatches(buildDemoPermissionProfiles(organizationId), INJECT_BATCH_SIZE, (body) =>
        this.permissions.createProfile(body),
      );

      const templates = await runInBatches(
        buildDemoCaseTemplates(organizationId),
        INJECT_BATCH_SIZE,
        (body) => this.caseTemplates.createTemplate(body),
      );
      const templateIds = templates.map((t) => t.id);

      const interventionTypeIds = await this.ensureDemoInterventionTypeIds(organizationId);

      const customerBodies = buildDemoCustomers(organizationId);
      const customers = await runInBatches(customerBodies, INJECT_BATCH_SIZE, (body) =>
        this.customers.createCustomer(body),
      );
      const demoCustomers = customers.map((c, i) => ({
        id: c.id,
        displayName: demoCustomerDisplayName(customerBodies[i]!),
      }));

      await runInBatches(buildDemoArticles(organizationId, orgSuffix), INJECT_BATCH_SIZE, (body) =>
        this.articles.createArticle(body),
      );

      const caseAssignee = {
        userId: user.id,
        name: user.name?.trim() || user.email,
      };
      const caseSeeds = buildDemoCases(organizationId, demoCustomers, templateIds, caseAssignee);
      const createdCases = await runInBatches(caseSeeds, INJECT_BATCH_SIZE, async (seed) => {
        const created = await this.cases.createCase(seed.create);
        if (seed.status !== "draft") {
          await this.cases.updateCase(created.id, {
            organizationId,
            status: seed.status,
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
        (body) => this.interventions.createIntervention(body),
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

  /**
   * Réutilise Pose / SAV s’ils existent déjà (ex. import catalogue), sinon les crée en démo.
   */
  private async ensureDemoInterventionTypeIds(organizationId: string): Promise<string[]> {
    const existing = await this.interventionTypes.list(organizationId);
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
      const created = await this.interventionTypes.create(body);
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
    const existing = await this.technicians.findByUserId(organizationId, user.id);
    if (existing?.id) return existing.id;

    const nameParts = (user.name?.trim() || user.email).split(/\s+/);
    const firstName = nameParts[0] || "Admin";
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const created = await this.technicians.createTechnician({
      organizationId,
      firstName,
      lastName,
      email: user.email,
      status: "actif",
    });
    await this.technicians.linkUserToTechnician(organizationId, created.id, user.id);
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
    await this.organizations.updateTrialTestData(organizationId, body);
  }

  private async purgeAllServices(organizationId: string): Promise<void> {
    await this.cases.purgeTestData(organizationId);
    await this.articles.purgeTestData(organizationId);
    await this.prestations.purgeTestData(organizationId);
    await this.stockLocations.purgeTestData(organizationId);
    await this.fleet.purgeTestData(organizationId);
    await this.technicianPurge.purge(organizationId);
    await this.customers.purgeTestData(organizationId);
    await this.orderGivers.purgeTestData(organizationId);
    await this.permissions.purgeTestData(organizationId);
    await this.integrations.purgeTestData(organizationId);
  }
}
