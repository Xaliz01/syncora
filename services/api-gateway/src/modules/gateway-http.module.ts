import { Global, Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  providers: [OrganizationScopedHttpClient],
  exports: [OrganizationScopedHttpClient, HttpModule],
})
export class GatewayHttpModule {}
