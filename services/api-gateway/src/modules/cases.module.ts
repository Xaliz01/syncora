import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { CasesController } from "../presentation/http/cases.controller";
import { CasesGatewayService } from "../domain/cases.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [CasesController],
  providers: [CasesGatewayService, RequirePermissionGuard]
})
export class CasesModule {}
