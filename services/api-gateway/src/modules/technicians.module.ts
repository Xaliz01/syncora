import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TechniciansController } from "../presentation/http/technicians.controller";
import { AbstractTechniciansGatewayService } from "../domain/ports/technicians.service.port";
import { TechniciansGatewayService } from "../domain/technicians.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { AdminModule } from "./admin.module";
import { TechniciansDomainModule } from "./technicians-domain.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    SubscriptionsModule,
    AdminModule,
    TechniciansDomainModule,
  ],
  controllers: [TechniciansController],
  providers: [
    { provide: AbstractTechniciansGatewayService, useClass: TechniciansGatewayService },
    RequirePermissionGuard,
  ],
})
export class TechniciansModule {}
