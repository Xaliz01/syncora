import { Module } from "@nestjs/common";
import { SubscriptionsController } from "../presentation/http/subscriptions.controller";
import { StripeWebhookController } from "../presentation/http/stripe-webhook.controller";
import { httpControllers } from "../process-role";
import { AbstractSubscriptionsGatewayService } from "../domain/ports/subscriptions.service.port";
import { SubscriptionsGatewayService } from "../domain/subscriptions.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../infrastructure/subscription-access.guard";
import { SubscriptionsDomainModule } from "./subscriptions-domain.module";
import { DocumentsDomainModule } from "./documents-domain.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";

@Module({
  imports: [SubscriptionsDomainModule, DocumentsDomainModule, OrganizationsDomainModule],
  controllers: httpControllers([SubscriptionsController, StripeWebhookController]),
  providers: [
    { provide: AbstractSubscriptionsGatewayService, useClass: SubscriptionsGatewayService },
    RequirePermissionGuard,
    SubscriptionAccessGuard,
  ],
  exports: [AbstractSubscriptionsGatewayService, SubscriptionAccessGuard],
})
export class SubscriptionsModule {}
