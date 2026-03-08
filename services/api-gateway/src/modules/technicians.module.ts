import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TechniciansController } from "../presentation/http/technicians.controller";
import { AbstractTechniciansGatewayService } from "../domain/ports/technicians.service.port";
import { TechniciansGatewayService } from "../domain/technicians.service";
import { AdminRoleGuard } from "../infrastructure/admin-role.guard";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [TechniciansController],
  providers: [
    { provide: AbstractTechniciansGatewayService, useClass: TechniciansGatewayService },
    AdminRoleGuard
  ]
})
export class TechniciansModule {}
