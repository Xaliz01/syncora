import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ExportsController } from "../presentation/http/exports.controller";
import { AbstractExportsGatewayService } from "../domain/ports/exports.service.port";
import { ExportsGatewayService } from "../domain/exports.service";
import { ExportsService } from "../domain/exports/exports.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { CasesModule } from "./cases.module";
import { CustomersDomainModule } from "./customers-domain.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { UsersModule } from "./users.module";
import { IntegrationsDomainModule } from "./integrations-domain.module";
import { PermissionsModule } from "./permissions.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 60000, maxRedirects: 0 }),
    SubscriptionsModule,
    CasesModule,
    CustomersDomainModule,
    TechniciansDomainModule,
    UsersModule,
    IntegrationsDomainModule,
    PermissionsModule,
  ],
  controllers: [ExportsController],
  providers: [
    ExportsService,
    { provide: AbstractExportsGatewayService, useClass: ExportsGatewayService },
    RequirePermissionGuard,
  ],
})
export class ExportsModule {}
