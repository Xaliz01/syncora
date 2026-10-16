import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TrialTestDataController } from "../presentation/http/trial-test-data.controller";
import { AbstractTrialTestDataService } from "../domain/ports/trial-test-data.service.port";
import { TrialTestDataService } from "../domain/trial-test-data.service";
import { TrialTestDataCleanupScheduler } from "../domain/organizations/trial-test-data-cleanup.scheduler";
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

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 0 }),
    SubscriptionsModule,
    SubscriptionsDomainModule,
    OrganizationsDomainModule,
    CasesModule,
    StockDomainModule,
    FleetDomainModule,
    TechniciansDomainModule,
    CustomersDomainModule,
    PermissionsModule,
  ],
  controllers: [TrialTestDataController],
  providers: [
    TrialTestDataService,
    { provide: AbstractTrialTestDataService, useExisting: TrialTestDataService },
    TrialTestDataCleanupScheduler,
    AdminRoleGuard,
  ],
  exports: [AbstractTrialTestDataService],
})
export class TrialTestDataModule {}
