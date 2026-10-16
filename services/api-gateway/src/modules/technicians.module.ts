import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { TechniciansController } from "../presentation/http/technicians.controller";
import { AbstractTechniciansGatewayService } from "../domain/ports/technicians.service.port";
import { TechniciansGatewayService } from "../domain/technicians.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { AdminModule } from "./admin.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { UsersModule } from "./users.module";
import { PermissionsModule } from "./permissions.module";

@Module({
  imports: [
    SubscriptionsModule,
    AdminModule,
    TechniciansDomainModule,
    UsersModule,
    PermissionsModule,
  ],
  controllers: httpControllers([TechniciansController]),
  providers: [
    { provide: AbstractTechniciansGatewayService, useClass: TechniciansGatewayService },
    RequirePermissionGuard,
  ],
})
export class TechniciansModule {}
