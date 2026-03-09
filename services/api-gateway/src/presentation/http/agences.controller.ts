import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { AbstractAgencesGatewayService } from "../../domain/ports/agences.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
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
  async createAgence(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAgencePayload
  ) {
    return this.agencesService.createAgence(user, body);
  }

  @Get()
  @RequirePermissions("agences.read")
  async listAgences(@CurrentUser() user: AuthUser) {
    return this.agencesService.listAgences(user);
  }

  @Get(":agenceId")
  @RequirePermissions("agences.read")
  async getAgence(
    @CurrentUser() user: AuthUser,
    @Param("agenceId") agenceId: string
  ) {
    return this.agencesService.getAgence(user, agenceId);
  }

  @Patch(":agenceId")
  @RequirePermissions("agences.update")
  async updateAgence(
    @CurrentUser() user: AuthUser,
    @Param("agenceId") agenceId: string,
    @Body() body: UpdateAgenceBody
  ) {
    return this.agencesService.updateAgence(user, agenceId, body);
  }

  @Delete(":agenceId")
  @RequirePermissions("agences.delete")
  async deleteAgence(
    @CurrentUser() user: AuthUser,
    @Param("agenceId") agenceId: string
  ) {
    return this.agencesService.deleteAgence(user, agenceId);
  }
}
