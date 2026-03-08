import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DossiersController } from "../presentation/http/dossiers.controller";
import { DossiersGatewayService } from "../domain/dossiers.service";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [DossiersController],
  providers: [DossiersGatewayService]
})
export class DossiersModule {}
