import { Module } from "@nestjs/common";
import { SubscriptionsController } from "../presentation/http/subscriptions.controller";
import { AbstractSubscriptionsGatewayService } from "../domain/ports/subscriptions.service.port";
import { SubscriptionsGatewayService } from "../domain/subscriptions.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../infrastructure/subscription-access.guard";
import { SubscriptionsDomainModule } from "./subscriptions-domain.module";
import { DocumentsDomainModule } from "./documents-domain.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";

@Module({
  imports: [SubscriptionsDomainModule, DocumentsDomainModule, OrganizationsDomainModule],
  controllers: [SubscriptionsController],
  providers: [
    { provide: AbstractSubscriptionsGatewayService, useClass: SubscriptionsGatewayService },
    RequirePermissionGuard,
    SubscriptionAccessGuard,
  ],
  exports: [AbstractSubscriptionsGatewayService, SubscriptionAccessGuard],
})
export class SubscriptionsModule {}
