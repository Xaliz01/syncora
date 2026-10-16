import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { IntegrationsController } from "../presentation/http/integrations.controller";
import { AbstractIntegrationsGatewayService } from "../domain/ports/integrations.service.port";
import { IntegrationsGatewayService } from "../domain/integrations.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CasesModule } from "./cases.module";
import { CustomersModule } from "./customers.module";
import { OrderGiversModule } from "./order-givers.module";
import { SubscriptionsModule } from "./subscriptions.module";
import { IntegrationsDomainModule } from "./integrations-domain.module";

@Module({
  imports: [
    IntegrationsDomainModule,
    CasesModule,
    CustomersModule,
    OrderGiversModule,
    SubscriptionsModule,
  ],
  controllers: httpControllers([IntegrationsController]),
  providers: [
    { provide: AbstractIntegrationsGatewayService, useClass: IntegrationsGatewayService },
    RequirePermissionGuard,
  ],
})
export class IntegrationsModule {}
