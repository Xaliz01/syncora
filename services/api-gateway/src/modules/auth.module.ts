import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { AuthController } from "../presentation/http/auth.controller";
import { AbstractAuthService } from "../domain/ports/auth.service.port";
import { AuthService } from "../domain/auth.service";
import { RequirePermissionGuard } from "../infrastructure/require-permission.guard";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    SubscriptionsModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "syncora-dev-secret-change-in-production",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [{ provide: AbstractAuthService, useClass: AuthService }, RequirePermissionGuard],
})
export class AuthModule {}
