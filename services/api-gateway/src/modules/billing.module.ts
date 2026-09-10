import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BillingController } from "../presentation/http/billing.controller";
import { AbstractBillingGatewayService } from "../domain/ports/billing.service.port";
import { BillingGatewayService } from "../domain/billing.gateway.service";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CasesModule } from "./cases.module";
import { CustomersModule } from "./customers.module";
import { OrderGiversModule } from "./order-givers.module";
import { OrganizationsModule } from "./organizations.module";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 60000, maxRedirects: 0 }),
    CasesModule,
    CustomersModule,
    OrderGiversModule,
    OrganizationsModule,
    SubscriptionsModule,
  ],
  controllers: [BillingController],
  providers: [
    OrganizationScopedHttpClient,
    { provide: AbstractBillingGatewayService, useClass: BillingGatewayService },
    RequirePermissionGuard,
  ],
})
export class BillingModule {}
