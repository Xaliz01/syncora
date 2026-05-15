import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AdminController } from "../presentation/http/admin.controller";
import { AbstractAdminService } from "../domain/ports/admin.service.port";
import { AdminService } from "../domain/admin.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 }), SubscriptionsModule],
  controllers: [AdminController],
  providers: [{ provide: AbstractAdminService, useClass: AdminService }, RequirePermissionGuard],
})
export class AdminModule {}
