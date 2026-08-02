import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { CasesController } from "../presentation/http/cases.controller";
import { MaintenanceContractsController } from "../presentation/http/maintenance-contracts.controller";
import { AbstractCasesGatewayService } from "../domain/ports/cases.service.port";
import { CasesGatewayService } from "../domain/cases.service";
import { AbstractMaintenanceContractsGatewayService } from "../domain/ports/maintenance-contracts.service.port";
import { MaintenanceContractsGatewayService } from "../domain/maintenance-contracts.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { CustomersModule } from "./customers.module";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    CustomersModule,
    SubscriptionsModule,
  ],
  controllers: [CasesController, MaintenanceContractsController],
  providers: [
    { provide: AbstractCasesGatewayService, useClass: CasesGatewayService },
    {
      provide: AbstractMaintenanceContractsGatewayService,
      useClass: MaintenanceContractsGatewayService,
    },
    RequirePermissionGuard,
  ],
  exports: [AbstractCasesGatewayService, AbstractMaintenanceContractsGatewayService],
})
export class CasesModule {}
