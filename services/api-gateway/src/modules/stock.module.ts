import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { StockController } from "../presentation/http/stock.controller";
import { StockGatewayService } from "../domain/stock.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [StockController],
  providers: [StockGatewayService, RequirePermissionGuard]
})
export class StockModule {}
