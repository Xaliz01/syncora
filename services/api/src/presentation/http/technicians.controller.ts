import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { AbstractTechniciansGatewayService } from "../../domain/ports/technicians.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type {
  AuthUser,
  LinkTechnicianUserBody,
  UpdateTechnicianBody,
  TechnicianStatus,
} from "@planwise/shared";

interface CreateTechnicianPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status?: TechnicianStatus;
  calendarColor?: string;
  createUserAccount?: boolean;
}

@Controller("fleet/technicians")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class TechniciansController {
  constructor(private readonly techniciansService: AbstractTechniciansGatewayService) {}

  @Post()
  @RequirePermissions("fleet.technicians.create")
  @RequirePermissions("technicians.create")
  @NotifyEntity({ type: "technician", labelField: "firstName" })
  async createTechnician(@CurrentUser() user: AuthUser, @Body() body: CreateTechnicianPayload) {
    return this.techniciansService.createTechnician(user, body);
  }

  @Get()
  @RequirePermissions("fleet.technicians.read")
  @RequirePermissions("technicians.read")
  async listTechnicians(@CurrentUser() user: AuthUser) {
    return this.techniciansService.listTechnicians(user);
  }

  @Get(":technicianId")
  @RequirePermissions("fleet.technicians.read")
  @RequirePermissions("technicians.read")
  async getTechnician(@CurrentUser() user: AuthUser, @Param("technicianId") technicianId: string) {
    return this.techniciansService.getTechnician(user, technicianId);
  }

  @Patch(":technicianId")
  @RequirePermissions("fleet.technicians.update")
  @RequirePermissions("technicians.update")
  @NotifyEntity({ type: "technician", labelField: "firstName" })
  async updateTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
    @Body() body: UpdateTechnicianBody,
  ) {
    return this.techniciansService.updateTechnician(user, technicianId, body);
  }

  @Delete(":technicianId")
  @RequirePermissions("fleet.technicians.delete")
  @RequirePermissions("technicians.delete")
  @NotifyEntity({ type: "technician", idParam: "technicianId" })
  async deleteTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
  ) {
    return this.techniciansService.deleteTechnician(user, technicianId);
  }

  @Post(":technicianId/create-account")
  @RequirePermissions("fleet.technicians.create_user")
  @RequirePermissions("technicians.update")
  async createTechnicianAccount(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
  ) {
    return this.techniciansService.createTechnicianUserAccount(user, technicianId);
  }

  @Put(":technicianId/link-user")
  @RequirePermissions("fleet.technicians.create_user")
  @RequirePermissions("technicians.update")
  async linkTechnicianUser(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
    @Body() body: LinkTechnicianUserBody,
  ) {
    return this.techniciansService.linkTechnicianUser(user, technicianId, body.userId);
  }
}
