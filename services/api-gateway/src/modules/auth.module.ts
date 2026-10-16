import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { AuthController } from "../presentation/http/auth.controller";
import { AbstractAuthService } from "../domain/ports/auth.service.port";
import { AuthService } from "../domain/auth.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { OnboardingAuthGuard } from "../infrastructure/onboarding-auth.guard";
import { CreateOrganizationGuard } from "../infrastructure/create-organization.guard";
import { AuthOrOnboardingGuard } from "../infrastructure/auth-or-onboarding.guard";
import { SubscriptionsModule } from "./subscriptions.module";
import { UsersModule } from "./users.module";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { PermissionsModule } from "./permissions.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { NotificationsDomainModule } from "./notifications-domain.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, "../../.env"),
    }),
    SubscriptionsModule,
    UsersModule,
    OrganizationsDomainModule,
    PermissionsModule,
    TechniciansDomainModule,
    NotificationsDomainModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "planwise-dev-secret-change-in-production",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: AbstractAuthService, useClass: AuthService },
    RequirePermissionGuard,
    OnboardingAuthGuard,
    CreateOrganizationGuard,
    AuthOrOnboardingGuard,
  ],
})
export class AuthModule {}
