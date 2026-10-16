import { Module } from "@nestjs/common";
import { OrderGiversController } from "../presentation/http/order-givers.controller";
import { AbstractOrderGiversGatewayService } from "../domain/ports/order-givers.service.port";
import { OrderGiversGatewayService } from "../domain/order-givers.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { CustomersDomainModule } from "./customers-domain.module";

@Module({
  imports: [SubscriptionsModule, CustomersDomainModule],
  controllers: [OrderGiversController],
  providers: [
    { provide: AbstractOrderGiversGatewayService, useClass: OrderGiversGatewayService },
    RequirePermissionGuard,
  ],
  exports: [AbstractOrderGiversGatewayService],
})
export class OrderGiversModule {}
