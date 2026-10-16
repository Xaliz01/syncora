import { Module } from "@nestjs/common";
import { AnalyticsGatewayController } from "../presentation/http/analytics.controller";
import { AbstractAnalyticsGatewayService } from "../domain/ports/analytics.gateway.service.port";
import { AnalyticsGatewayService } from "../domain/analytics.gateway.service";
import { OrganizationsDomainModule } from "./organizations-domain.module";

@Module({
  imports: [OrganizationsDomainModule],
  controllers: [AnalyticsGatewayController],
  providers: [{ provide: AbstractAnalyticsGatewayService, useClass: AnalyticsGatewayService }],
  exports: [AbstractAnalyticsGatewayService],
})
export class AnalyticsModule {}
