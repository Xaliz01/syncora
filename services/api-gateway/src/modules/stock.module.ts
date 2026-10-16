import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { StockController } from "../presentation/http/stock.controller";
import { AbstractStockGatewayService } from "../domain/ports/stock.service.port";
import { StockGatewayService } from "../domain/stock.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { StockDomainModule } from "./stock-domain.module";

@Module({
  imports: [SubscriptionsModule, StockDomainModule],
  controllers: httpControllers([StockController]),
  providers: [
    { provide: AbstractStockGatewayService, useClass: StockGatewayService },
    RequirePermissionGuard,
  ],
})
export class StockModule {}
