import { Module } from "@nestjs/common";
import { TrialTestDataController } from "../presentation/http/trial-test-data.controller";
import { AbstractTrialTestDataService } from "../domain/ports/trial-test-data.service.port";
import { TrialTestDataService } from "../domain/trial-test-data.service";
import { TrialTestDataCleanupScheduler } from "../domain/organizations/trial-test-data-cleanup.scheduler";
import { httpControllers, whenWorkerCrons } from "../process-role";
import { AdminRoleGuard } from "../infrastructure/admin-role.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { SubscriptionsDomainModule } from "./subscriptions-domain.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { CasesModule } from "./cases.module";
import { StockDomainModule } from "./stock-domain.module";
import { FleetDomainModule } from "./fleet-domain.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { CustomersDomainModule } from "./customers-domain.module";
import { PermissionsModule } from "./permissions.module";
import { IntegrationsDomainModule } from "./integrations-domain.module";

@Module({
  imports: [
    SubscriptionsModule,
    SubscriptionsDomainModule,
    OrganizationsDomainModule,
    CasesModule,
    StockDomainModule,
    FleetDomainModule,
    TechniciansDomainModule,
    CustomersDomainModule,
    PermissionsModule,
    IntegrationsDomainModule,
  ],
  controllers: httpControllers([TrialTestDataController]),
  providers: [
    TrialTestDataService,
    { provide: AbstractTrialTestDataService, useExisting: TrialTestDataService },
    ...whenWorkerCrons([TrialTestDataCleanupScheduler]),
    AdminRoleGuard,
  ],
  exports: [AbstractTrialTestDataService],
})
export class TrialTestDataModule {}
