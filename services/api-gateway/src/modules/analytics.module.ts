import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AnalyticsGatewayController } from "../presentation/http/analytics.controller";
import { AbstractAnalyticsGatewayService } from "../domain/ports/analytics.gateway.service.port";
import { AnalyticsGatewayService } from "../domain/analytics.gateway.service";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [AnalyticsGatewayController],
  providers: [{ provide: AbstractAnalyticsGatewayService, useClass: AnalyticsGatewayService }],
  exports: [AbstractAnalyticsGatewayService],
})
export class AnalyticsModule {}
