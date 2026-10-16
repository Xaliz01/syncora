import { Module } from "@nestjs/common";
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

@Module({
  imports: [
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
  ],
  exports: [
    AbstractOrganizationsService,
    AbstractAnalyticsService,
    AbstractDataImportRunsService,
    CronRunRecorder,
  ],
})
export class OrganizationsDomainModule {}
