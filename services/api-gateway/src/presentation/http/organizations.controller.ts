import { Body, Controller, Get, NotFoundException, Patch, Query, UseGuards } from "@nestjs/common";
import { AbstractOrganizationsGatewayService } from "../../domain/ports/organizations.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { AuthOrOnboardingGuard } from "../../infrastructure/auth-or-onboarding.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser, SiretLookupResponse, UpdateOrganizationBody } from "@syncora/shared";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: AbstractOrganizationsGatewayService) {}

  @Get("mine")
  @UseGuards(JwtAuthGuard, RequirePermissionGuard)
  listMine(@CurrentUser() user: AuthUser) {
    return this.organizationsService.listMine(user);
  }

  @Get("mine/current")
  @UseGuards(JwtAuthGuard, RequirePermissionGuard)
  @RequirePermissions("organizations.read")
  async getMine(@CurrentUser() user: AuthUser) {
    const org = await this.organizationsService.getMine(user);
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  @Patch("mine")
  @UseGuards(JwtAuthGuard, RequirePermissionGuard)
  @RequirePermissions("organizations.update")
  @NotifyEntity({ type: "organization", labelField: "name" })
  async updateMine(@CurrentUser() user: AuthUser, @Body() body: UpdateOrganizationBody) {
    const org = await this.organizationsService.updateMine(user, body);
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  @Get("siret-lookup")
  @UseGuards(AuthOrOnboardingGuard)
  async lookupSiret(@Query("q") query: string): Promise<SiretLookupResponse> {
    return this.organizationsService.lookupSiret(query ?? "");
  }
}
