import { Module } from "@nestjs/common";
import { FleetController } from "../presentation/http/fleet.controller";
import { AbstractFleetGatewayService } from "../domain/ports/fleet.service.port";
import { FleetGatewayService } from "../domain/fleet.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { FleetDomainModule } from "./fleet-domain.module";

@Module({
  imports: [SubscriptionsModule, FleetDomainModule],
  controllers: [FleetController],
  providers: [
    { provide: AbstractFleetGatewayService, useClass: FleetGatewayService },
    RequirePermissionGuard,
  ],
})
export class FleetModule {}
