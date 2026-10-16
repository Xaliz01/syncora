import { Global, Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { JwtAuthGuard } from "../infrastructure/jwt-auth.guard";
import { UsersModule } from "./users.module";

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 }), UsersModule],
  providers: [OrganizationScopedHttpClient, JwtAuthGuard],
  exports: [OrganizationScopedHttpClient, HttpModule, JwtAuthGuard],
})
export class GatewayHttpModule {}
