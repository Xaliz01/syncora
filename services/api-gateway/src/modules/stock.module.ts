import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { StockController } from "../presentation/http/stock.controller";
import { AbstractStockGatewayService } from "../domain/ports/stock.service.port";
import { StockGatewayService } from "../domain/stock.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 }), SubscriptionsModule],
  controllers: [StockController],
  providers: [
    { provide: AbstractStockGatewayService, useClass: StockGatewayService },
    RequirePermissionGuard
  ]
})
export class StockModule {}
