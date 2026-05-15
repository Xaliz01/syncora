import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AbstractAgencesGatewayService } from "../../domain/ports/agences.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequireAnyPermissions,
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser, UpdateAgenceBody } from "@syncora/shared";

interface CreateAgencePayload {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
}

@Controller("fleet/agences")
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class AgencesGatewayController {
  constructor(private readonly agencesService: AbstractAgencesGatewayService) {}

  @Post()
  @RequirePermissions("agences.create")
  @NotifyEntity({ type: "agence", labelField: "name" })
  async createAgence(@CurrentUser() user: AuthUser, @Body() body: CreateAgencePayload) {
    return this.agencesService.createAgence(user, body);
  }

  @Get()
  @RequireAnyPermissions("agences.read", "teams.read")
  async listAgences(@CurrentUser() user: AuthUser) {
    return this.agencesService.listAgences(user);
  }

  @Get(":agenceId")
  @RequireAnyPermissions("agences.read", "teams.read")
  async getAgence(@CurrentUser() user: AuthUser, @Param("agenceId") agenceId: string) {
    return this.agencesService.getAgence(user, agenceId);
  }

  @Patch(":agenceId")
  @RequirePermissions("agences.update")
  @NotifyEntity({ type: "agence", labelField: "name" })
  async updateAgence(
    @CurrentUser() user: AuthUser,
    @Param("agenceId") agenceId: string,
    @Body() body: UpdateAgenceBody,
  ) {
    return this.agencesService.updateAgence(user, agenceId, body);
  }

  @Delete(":agenceId")
  @RequirePermissions("agences.delete")
  @NotifyEntity({ type: "agence", idParam: "agenceId" })
  async deleteAgence(@CurrentUser() user: AuthUser, @Param("agenceId") agenceId: string) {
    return this.agencesService.deleteAgence(user, agenceId);
  }
}
