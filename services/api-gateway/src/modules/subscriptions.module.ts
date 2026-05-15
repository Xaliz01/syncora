import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { SubscriptionsController } from "../presentation/http/subscriptions.controller";
import { AbstractSubscriptionsGatewayService } from "../domain/ports/subscriptions.service.port";
import { SubscriptionsGatewayService } from "../domain/subscriptions.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../infrastructure/subscription-access.guard";

@Module({
  imports: [HttpModule.register({ timeout: 15000, maxRedirects: 0 })],
  controllers: [SubscriptionsController],
  providers: [
    { provide: AbstractSubscriptionsGatewayService, useClass: SubscriptionsGatewayService },
    RequirePermissionGuard,
    SubscriptionAccessGuard,
  ],
  exports: [AbstractSubscriptionsGatewayService, SubscriptionAccessGuard],
})
export class SubscriptionsModule {}
