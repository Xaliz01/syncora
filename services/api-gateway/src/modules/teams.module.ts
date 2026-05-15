import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TeamsGatewayController } from "../presentation/http/teams.controller";
import { AbstractTeamsGatewayService } from "../domain/ports/teams.service.port";
import { TeamsGatewayService } from "../domain/teams.service";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [TeamsGatewayController],
  providers: [{ provide: AbstractTeamsGatewayService, useClass: TeamsGatewayService }],
})
export class TeamsModule {}
