import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { AbstractIntegrationsService } from "../domain/integrations/ports/integrations.service.port";
import { IntegrationsService } from "../domain/integrations/integrations.service";
import {
  BILLING_PROVIDER_ADAPTERS,
  type BillingProviderAdapter,
} from "../domain/integrations/providers/billing-provider.adapter";
import { DemoBillingAdapter } from "../domain/integrations/providers/demo.billing.adapter";
import { PennylaneBillingAdapter } from "../domain/integrations/providers/pennylane.billing.adapter";
import { QontoBillingAdapter } from "../domain/integrations/providers/qonto.billing.adapter";
import {
  IntegrationCredentialSchema,
  IntegrationSyncSchema,
} from "../persistence/integrations/integration.schema";
import { CronRunSchema } from "../persistence/integrations/cron-run.schema";
import { CronRunRecorder } from "../domain/integrations/cron-run.recorder";

@Module({
  imports: [
    HttpModule.register({ timeout: 30000, maxRedirects: 0 }),
    MongooseModule.forFeature(
      [
        { name: "IntegrationCredential", schema: IntegrationCredentialSchema },
        { name: "IntegrationSync", schema: IntegrationSyncSchema },
        { name: "CronRun", schema: CronRunSchema },
      ],
      "integrations",
    ),
  ],
  providers: [
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
  ],
  exports: [AbstractIntegrationsService, CronRunRecorder],
})
export class IntegrationsDomainModule {}
