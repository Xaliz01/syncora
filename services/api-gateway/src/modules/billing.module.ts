import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BillingController } from "../presentation/http/billing.controller";
import { AbstractBillingGatewayService } from "../domain/ports/billing.service.port";
import { BillingGatewayService } from "../domain/billing.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CasesModule } from "./cases.module";
import { CustomersModule } from "./customers.module";
import { OrderGiversModule } from "./order-givers.module";
import { OrganizationsModule } from "./organizations.module";
import { SubscriptionsModule } from "./subscriptions.module";
import { BillingDomainModule } from "./billing-domain.module";
import { DocumentsDomainModule } from "./documents-domain.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 60000, maxRedirects: 0 }),
    CasesModule,
    CustomersModule,
    OrderGiversModule,
    OrganizationsModule,
    SubscriptionsModule,
    BillingDomainModule,
    DocumentsDomainModule,
  ],
  controllers: httpControllers([BillingController]),
  providers: [
    { provide: AbstractBillingGatewayService, useClass: BillingGatewayService },
    RequirePermissionGuard,
  ],
})
export class BillingModule {}
