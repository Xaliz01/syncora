import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { AdminController } from "../presentation/http/admin.controller";
import { AbstractAdminService } from "../domain/ports/admin.service.port";
import { AdminService } from "../domain/admin.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { UsersModule } from "./users.module";
import { PermissionsModule } from "./permissions.module";
import { NotificationsDomainModule } from "./notifications-domain.module";
import { SubscriptionsDomainModule } from "./subscriptions-domain.module";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [
    UsersModule,
    PermissionsModule,
    NotificationsDomainModule,
    SubscriptionsDomainModule,
    SubscriptionsModule,
  ],
  controllers: httpControllers([AdminController]),
  providers: [{ provide: AbstractAdminService, useClass: AdminService }, RequirePermissionGuard],
  exports: [AbstractAdminService],
})
export class AdminModule {}
