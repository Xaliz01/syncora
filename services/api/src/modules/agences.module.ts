import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { AgencesGatewayController } from "../presentation/http/agences.controller";
import { AbstractAgencesGatewayService } from "../domain/ports/agences.service.port";
import { AgencesGatewayService } from "../domain/agences.service";
import { TechniciansDomainModule } from "./technicians-domain.module";

@Module({
  imports: [TechniciansDomainModule],
  controllers: httpControllers([AgencesGatewayController]),
  providers: [{ provide: AbstractAgencesGatewayService, useClass: AgencesGatewayService }],
})
export class AgencesModule {}
