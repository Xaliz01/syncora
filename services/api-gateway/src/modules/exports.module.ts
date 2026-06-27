import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ExportsController } from "../presentation/http/exports.controller";
import { AbstractExportsGatewayService } from "../domain/ports/exports.service.port";
import { ExportsGatewayService } from "../domain/exports.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";

@Module({
  imports: [HttpModule.register({ timeout: 60000, maxRedirects: 0 })],
  controllers: [ExportsController],
  providers: [
    { provide: AbstractExportsGatewayService, useClass: ExportsGatewayService },
    RequirePermissionGuard,
  ],
})
export class ExportsModule {}
