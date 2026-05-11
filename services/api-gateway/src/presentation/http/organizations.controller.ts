import { Body, Controller, Get, NotFoundException, Patch, UseGuards } from "@nestjs/common";
import { AbstractOrganizationsGatewayService } from "../../domain/ports/organizations.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser, UpdateOrganizationBody } from "@syncora/shared";

@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: AbstractOrganizationsGatewayService) {}

  @Get("mine")
  listMine(@CurrentUser() user: AuthUser) {
    return this.organizationsService.listMine(user);
  }

  @Get("mine/current")
  async getMine(@CurrentUser() user: AuthUser) {
    const org = await this.organizationsService.getMine(user);
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  @Patch("mine")
  async updateMine(@CurrentUser() user: AuthUser, @Body() body: UpdateOrganizationBody) {
    const org = await this.organizationsService.updateMine(user, body);
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }
}
