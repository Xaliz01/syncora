import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { CustomersController } from "../presentation/http/customers.controller";
import { AbstractCustomersGatewayService } from "../domain/ports/customers.service.port";
import { CustomersGatewayService } from "../domain/customers.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 }), SubscriptionsModule],
  controllers: [CustomersController],
  providers: [
    { provide: AbstractCustomersGatewayService, useClass: CustomersGatewayService },
    RequirePermissionGuard,
  ],
  exports: [AbstractCustomersGatewayService],
})
export class CustomersModule {}
