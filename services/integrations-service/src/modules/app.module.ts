import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { IntegrationsController } from "../presentation/http/integrations.controller";
import { AbstractIntegrationsService } from "../domain/ports/integrations.service.port";
import { IntegrationsService } from "../domain/integrations.service";
import { InvoiceSyncScheduler } from "../domain/invoice-sync.scheduler";
import {
  IntegrationCredentialSchema,
  IntegrationSyncSchema,
} from "../persistence/integration.schema";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 30000, maxRedirects: 0 }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-integrations",
    ),
    MongooseModule.forFeature([
      { name: "IntegrationCredential", schema: IntegrationCredentialSchema },
      { name: "IntegrationSync", schema: IntegrationSyncSchema },
    ]),
  ],
  controllers: [IntegrationsController, HealthController],
  providers: [
    provideHealthServiceName("planwise-integrations-service"),
    { provide: AbstractIntegrationsService, useClass: IntegrationsService },
    InvoiceSyncScheduler,
  ],
})
export class AppModule {}
