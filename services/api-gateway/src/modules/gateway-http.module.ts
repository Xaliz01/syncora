import { Global, Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { JwtAuthGuard } from "../infrastructure/jwt-auth.guard";

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  providers: [OrganizationScopedHttpClient, JwtAuthGuard],
  exports: [OrganizationScopedHttpClient, HttpModule, JwtAuthGuard],
})
export class GatewayHttpModule {}
