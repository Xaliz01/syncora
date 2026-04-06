import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { OrganizationsController } from "../presentation/http/organizations.controller";
import { AbstractOrganizationsGatewayService } from "../domain/ports/organizations.service.port";
import { OrganizationsGatewayService } from "../domain/organizations.gateway.service";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  controllers: [OrganizationsController],
  providers: [{ provide: AbstractOrganizationsGatewayService, useClass: OrganizationsGatewayService }]
})
export class OrganizationsModule {}
