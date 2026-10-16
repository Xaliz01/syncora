import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { OrganizationSchema } from "../persistence/organizations/organization.schema";
import { CronRunSchema } from "../persistence/organizations/cron-run.schema";
import { PageViewSchema } from "../persistence/organizations/page-view.schema";
import { DataImportRunSchema } from "../persistence/organizations/data-import-run.schema";
import { AbstractOrganizationsService } from "../domain/organizations/ports/organizations.service.port";
import { OrganizationsService } from "../domain/organizations/organizations.service";
import { AbstractAnalyticsService } from "../domain/organizations/ports/analytics.service.port";
import { AnalyticsService } from "../domain/organizations/analytics.service";
import { AbstractDataImportRunsService } from "../domain/organizations/ports/data-import-runs.service.port";
import { DataImportRunsService } from "../domain/organizations/data-import-runs.service";
import { CronRunRecorder } from "../domain/organizations/cron-run.recorder";
import { TrialTestDataCleanupScheduler } from "../domain/organizations/trial-test-data-cleanup.scheduler";

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 0 }),
    MongooseModule.forFeature(
      [
        { name: "Organization", schema: OrganizationSchema },
        { name: "CronRun", schema: CronRunSchema },
        { name: "PageView", schema: PageViewSchema },
        { name: "DataImportRun", schema: DataImportRunSchema },
      ],
      "organizations",
    ),
  ],
  providers: [
    { provide: AbstractOrganizationsService, useClass: OrganizationsService },
    { provide: AbstractAnalyticsService, useClass: AnalyticsService },
    { provide: AbstractDataImportRunsService, useClass: DataImportRunsService },
    CronRunRecorder,
    TrialTestDataCleanupScheduler,
  ],
  exports: [AbstractOrganizationsService, AbstractAnalyticsService, AbstractDataImportRunsService],
})
export class OrganizationsDomainModule {}
