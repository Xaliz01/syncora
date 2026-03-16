import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { FleetController } from "../presentation/http/fleet.controller";
import { AbstractFleetGatewayService } from "../domain/ports/fleet.service.port";
import { FleetGatewayService } from "../domain/fleet.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [FleetController],
  providers: [
    { provide: AbstractFleetGatewayService, useClass: FleetGatewayService },
    RequirePermissionGuard
  ]
})
export class FleetModule {}
