import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AdminController } from "../presentation/http/admin.controller";
import { AbstractAdminService } from "../domain/ports/admin.service.port";
import { AdminService } from "../domain/admin.service";
import { AdminRoleGuard } from "../infrastructure/admin-role.guard";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [AdminController],
  providers: [{ provide: AbstractAdminService, useClass: AdminService }, AdminRoleGuard]
})
export class AdminModule {}
