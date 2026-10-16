import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { CustomersController } from "../presentation/http/customers.controller";
import { AbstractCustomersGatewayService } from "../domain/ports/customers.service.port";
import { CustomersGatewayService } from "../domain/customers.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { CustomersDomainModule } from "./customers-domain.module";

@Module({
  imports: [SubscriptionsModule, CustomersDomainModule],
  controllers: httpControllers([CustomersController]),
  providers: [
    { provide: AbstractCustomersGatewayService, useClass: CustomersGatewayService },
    RequirePermissionGuard,
  ],
  exports: [AbstractCustomersGatewayService],
})
export class CustomersModule {}
