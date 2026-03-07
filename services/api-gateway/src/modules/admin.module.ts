import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AdminController } from "../presentation/http/admin.controller";
import { AdminService } from "../domain/admin.service";
import { AdminRoleGuard } from "../infrastructure/admin-role.guard";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [AdminController],
  providers: [AdminService, AdminRoleGuard]
})
export class AdminModule {}
