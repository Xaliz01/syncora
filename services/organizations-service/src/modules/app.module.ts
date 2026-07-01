import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { OrganizationsController } from "../presentation/http/organizations.controller";
import { OrganizationSchema } from "../persistence/organization.schema";
import { AbstractOrganizationsService } from "../domain/ports/organizations.service.port";
import { OrganizationsService } from "../domain/organizations.service";
import { TrialTestDataCleanupScheduler } from "../domain/trial-test-data-cleanup.scheduler";


@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 0 }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-organizations",
    ),
    MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }]),
  ],
  controllers: [OrganizationsController, HealthController],
  providers: [
    provideHealthServiceName("planwise-organizations-service"),
    { provide: AbstractOrganizationsService, useClass: OrganizationsService },
    TrialTestDataCleanupScheduler,
  ],
})
export class AppModule {}
