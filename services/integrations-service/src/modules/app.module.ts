import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { IntegrationsController } from "../presentation/http/integrations.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { AbstractIntegrationsService } from "../domain/ports/integrations.service.port";
import { IntegrationsService } from "../domain/integrations.service";
import {
  BILLING_PROVIDER_ADAPTERS,
  type BillingProviderAdapter,
} from "../domain/providers/billing-provider.adapter";
import { DemoBillingAdapter } from "../domain/providers/demo.billing.adapter";
import { PennylaneBillingAdapter } from "../domain/providers/pennylane.billing.adapter";
import { QontoBillingAdapter } from "../domain/providers/qonto.billing.adapter";
import { InvoiceSyncScheduler } from "../domain/invoice-sync.scheduler";
import {
  IntegrationCredentialSchema,
  IntegrationSyncSchema,
} from "../persistence/integration.schema";
import { CronRunSchema } from "../persistence/cron-run.schema";
import { CronRunRecorder } from "../domain/cron-run.recorder";

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
      { name: "CronRun", schema: CronRunSchema },
    ]),
  ],
  controllers: [IntegrationsController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-integrations-service"),
    provideHttpAccessLogInterceptor(),
    PennylaneBillingAdapter,
    QontoBillingAdapter,
    DemoBillingAdapter,
    {
      provide: BILLING_PROVIDER_ADAPTERS,
      useFactory: (
        pennylane: PennylaneBillingAdapter,
        qonto: QontoBillingAdapter,
        demo: DemoBillingAdapter,
      ) =>
        new Map<string, BillingProviderAdapter>([
          [pennylane.provider, pennylane],
          [qonto.provider, qonto],
          [demo.provider, demo],
        ]),
      inject: [PennylaneBillingAdapter, QontoBillingAdapter, DemoBillingAdapter],
    },
    { provide: AbstractIntegrationsService, useClass: IntegrationsService },
    CronRunRecorder,
    InvoiceSyncScheduler,
  ],
})
export class AppModule {}
