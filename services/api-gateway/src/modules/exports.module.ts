import { Module } from "@nestjs/common";
import { ExportsController } from "../presentation/http/exports.controller";
import { AbstractExportsGatewayService } from "../domain/ports/exports.service.port";
import { ExportsGatewayService } from "../domain/exports.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";

@Module({
  controllers: [ExportsController],
  providers: [
    { provide: AbstractExportsGatewayService, useClass: ExportsGatewayService },
    RequirePermissionGuard,
  ],
})
export class ExportsModule {}
