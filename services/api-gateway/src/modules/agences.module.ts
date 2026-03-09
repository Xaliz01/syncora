import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AgencesGatewayController } from "../presentation/http/agences.controller";
import { AbstractAgencesGatewayService } from "../domain/ports/agences.service.port";
import { AgencesGatewayService } from "../domain/agences.service";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [AgencesGatewayController],
  providers: [
    { provide: AbstractAgencesGatewayService, useClass: AgencesGatewayService }
  ]
})
export class AgencesModule {}
