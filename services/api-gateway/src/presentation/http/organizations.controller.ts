import { Controller, Get, UseGuards } from "@nestjs/common";
import { AbstractOrganizationsGatewayService } from "../../domain/ports/organizations.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: AbstractOrganizationsGatewayService) {}

  @Get("mine")
  listMine(@CurrentUser() user: AuthUser) {
    return this.organizationsService.listMine(user);
  }
}
