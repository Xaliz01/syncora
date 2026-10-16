import { Module } from "@nestjs/common";
import { TeamsGatewayController } from "../presentation/http/teams.controller";
import { AbstractTeamsGatewayService } from "../domain/ports/teams.service.port";
import { TeamsGatewayService } from "../domain/teams.service";
import { TechniciansDomainModule } from "./technicians-domain.module";

@Module({
  imports: [TechniciansDomainModule],
  controllers: [TeamsGatewayController],
  providers: [{ provide: AbstractTeamsGatewayService, useClass: TeamsGatewayService }],
})
export class TeamsModule {}
