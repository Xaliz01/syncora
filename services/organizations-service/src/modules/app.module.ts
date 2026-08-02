import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { OrganizationsController } from "../presentation/http/organizations.controller";
import { AnalyticsController } from "../presentation/http/analytics.controller";
import { OrganizationSchema } from "../persistence/organization.schema";
import { CronRunSchema } from "../persistence/cron-run.schema";
import { PageViewSchema } from "../persistence/page-view.schema";
import { AbstractOrganizationsService } from "../domain/ports/organizations.service.port";
import { OrganizationsService } from "../domain/organizations.service";
import { AbstractAnalyticsService } from "../domain/ports/analytics.service.port";
import { AnalyticsService } from "../domain/analytics.service";
import { TrialTestDataCleanupScheduler } from "../domain/trial-test-data-cleanup.scheduler";
import { CronRunRecorder } from "../domain/cron-run.recorder";
import { PlatformOpsController } from "../presentation/http/platform-ops.controller";

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 0 }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-organizations",
    ),
    MongooseModule.forFeature([
      { name: "Organization", schema: OrganizationSchema },
      { name: "CronRun", schema: CronRunSchema },
      { name: "PageView", schema: PageViewSchema },
    ]),
  ],
  controllers: [
    OrganizationsController,
    AnalyticsController,
    PlatformOpsController,
    HealthController,
  ],
  providers: [
    provideHealthServiceName("planwise-organizations-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractOrganizationsService, useClass: OrganizationsService },
    { provide: AbstractAnalyticsService, useClass: AnalyticsService },
    CronRunRecorder,
    TrialTestDataCleanupScheduler,
  ],
})
export class AppModule {}
