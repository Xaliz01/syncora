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
import { AbstractTechniciansGatewayService } from "../../domain/ports/technicians.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { AdminRoleGuard } from "../../infrastructure/admin-role.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import type {
  CreateTechnicianUserAccountBody,
  UpdateTechnicianBody,
  TechnicianStatus
} from "@syncora/shared";

interface CreateTechnicianPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status?: TechnicianStatus;
  createUserAccount?: boolean;
  userAccountPassword?: string;
}

@Controller("fleet/technicians")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: AbstractTechniciansGatewayService) {}

  @Post()
  async createTechnician(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTechnicianPayload
  ) {
    return this.techniciansService.createTechnician(user, body);
  }

  @Get()
  async listTechnicians(@CurrentUser() user: AuthUser) {
    return this.techniciansService.listTechnicians(user);
  }

  @Get(":technicianId")
  async getTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string
  ) {
    return this.techniciansService.getTechnician(user, technicianId);
  }

  @Patch(":technicianId")
  async updateTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
    @Body() body: UpdateTechnicianBody
  ) {
    return this.techniciansService.updateTechnician(user, technicianId, body);
  }

  @Delete(":technicianId")
  async deleteTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string
  ) {
    return this.techniciansService.deleteTechnician(user, technicianId);
  }

  @Post(":technicianId/create-account")
  async createTechnicianAccount(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
    @Body() body: CreateTechnicianUserAccountBody
  ) {
    return this.techniciansService.createTechnicianUserAccount(user, technicianId, body);
  }
}
