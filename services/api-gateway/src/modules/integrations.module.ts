import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { IntegrationsController } from "../presentation/http/integrations.controller";
import { AbstractIntegrationsGatewayService } from "../domain/ports/integrations.service.port";
import { IntegrationsGatewayService } from "../domain/integrations.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CasesModule } from "./cases.module";
import { CustomersModule } from "./customers.module";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 60000, maxRedirects: 0 }),
    CasesModule,
    CustomersModule,
    SubscriptionsModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    { provide: AbstractIntegrationsGatewayService, useClass: IntegrationsGatewayService },
    RequirePermissionGuard,
  ],
})
export class IntegrationsModule {}
