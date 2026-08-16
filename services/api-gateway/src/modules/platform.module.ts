import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PlatformController } from "../presentation/http/platform.controller";
import { AbstractPlatformService } from "../domain/ports/platform/platform.service.port";
import { AbstractPlatformAuthService } from "../domain/ports/platform/platform-auth.service.port";
import { AbstractPlatformDashboardService } from "../domain/ports/platform/platform-dashboard.service.port";
import { AbstractPlatformDirectoryService } from "../domain/ports/platform/platform-directory.service.port";
import { AbstractPlatformEmailTemplatesService } from "../domain/ports/platform/platform-email-templates.service.port";
import { AbstractPlatformIntegrationsCronsService } from "../domain/ports/platform/platform-integrations-crons.service.port";
import { AbstractPlatformOrgLookupService } from "../domain/ports/platform/platform-org-lookup.service.port";
import { AbstractPlatformProspectsService } from "../domain/ports/platform/platform-prospects.service.port";
import { AbstractPrometheusOpsHealthService } from "../domain/ports/platform/prometheus-ops-health.service.port";
import { PlatformService } from "../domain/platform/platform.service";
import { PlatformAuthService } from "../domain/platform/platform-auth.service";
import { PlatformDashboardService } from "../domain/platform/platform-dashboard.service";
import { PlatformDirectoryService } from "../domain/platform/platform-directory.service";
import { PlatformEmailTemplatesService } from "../domain/platform/platform-email-templates.service";
import { PlatformIntegrationsCronsService } from "../domain/platform/platform-integrations-crons.service";
import { PlatformOrgLookupService } from "../domain/platform/platform-org-lookup.service";
import { PlatformProspectsService } from "../domain/platform/platform-prospects.service";
import { PrometheusOpsHealthService } from "../domain/prometheus-ops-health.service";
import { PlatformJwtAuthGuard } from "../infrastructure/platform-jwt-auth.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { AnalyticsModule } from "./analytics.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 0 }),
    SubscriptionsModule,
    AnalyticsModule,
  ],
  controllers: [PlatformController],
  providers: [
    { provide: AbstractPrometheusOpsHealthService, useClass: PrometheusOpsHealthService },
    { provide: AbstractPlatformOrgLookupService, useClass: PlatformOrgLookupService },
    { provide: AbstractPlatformAuthService, useClass: PlatformAuthService },
    { provide: AbstractPlatformDirectoryService, useClass: PlatformDirectoryService },
    {
      provide: AbstractPlatformIntegrationsCronsService,
      useClass: PlatformIntegrationsCronsService,
    },
    { provide: AbstractPlatformDashboardService, useClass: PlatformDashboardService },
    { provide: AbstractPlatformEmailTemplatesService, useClass: PlatformEmailTemplatesService },
    { provide: AbstractPlatformProspectsService, useClass: PlatformProspectsService },
    { provide: AbstractPlatformService, useClass: PlatformService },
    PlatformJwtAuthGuard,
  ],
})
export class PlatformModule {}
