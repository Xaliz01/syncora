import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { OrganizationsController } from "../presentation/http/organizations.controller";
import { AbstractOrganizationsGatewayService } from "../domain/ports/organizations.service.port";
import { OrganizationsGatewayService } from "../domain/organizations.gateway.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { AuthOrOnboardingGuard } from "../infrastructure/auth-or-onboarding.guard";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { UsersModule } from "./users.module";

@Module({
  imports: [
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    OrganizationsDomainModule,
    UsersModule,
  ],
  controllers: [OrganizationsController],
  providers: [
    { provide: AbstractOrganizationsGatewayService, useClass: OrganizationsGatewayService },
    RequirePermissionGuard,
    AuthOrOnboardingGuard,
  ],
  exports: [AbstractOrganizationsGatewayService],
})
export class OrganizationsModule {}
