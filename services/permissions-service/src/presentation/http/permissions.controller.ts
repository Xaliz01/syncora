import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared";
import { AbstractPermissionsService } from "../../domain/ports/permissions.service.port";
import type {
  AssignUserPermissionsBody,
  CreateInvitationBody,
  CreatePermissionProfileBody,
  ResolveEffectivePermissionsBody,
  UpdatePermissionProfileBody,
} from "@syncora/shared";

@Controller()
export class PermissionsController {
  constructor(private readonly permissionsService: AbstractPermissionsService) {}

  @Post("profiles")
  async createProfile(@Body() body: CreatePermissionProfileBody) {
    return this.permissionsService.createProfile(body);
  }

  @Get("profiles")
  async listProfiles(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.permissionsService.listProfiles(organizationId);
  }

  @Get("profiles/:id")
  async findProfileById(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.permissionsService.findProfileById(id, organizationId);
  }

  @Patch("profiles/:id")
  async updateProfile(@Param("id") id: string, @Body() body: UpdatePermissionProfileBody) {
    return this.permissionsService.updateProfile(id, body);
  }

  @Delete("profiles/:id")
  async deleteProfile(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.permissionsService.deleteProfile(id, organizationId);
  }

  @Put("assignments/:userId")
  async assignUserPermissions(
    @Param("userId") userId: string,
    @Body() body: AssignUserPermissionsBody,
  ) {
    return this.permissionsService.assignUserPermissions({ ...body, userId });
  }

  @Get("assignments/:userId")
  async getUserAssignment(
    @Param("userId") userId: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.permissionsService.getUserAssignment(organizationId, userId);
  }

  @Post("permissions/effective")
  async resolveEffectivePermissions(@Body() body: ResolveEffectivePermissionsBody) {
    return this.permissionsService.resolveEffectivePermissions(body);
  }

  @Post("invitations")
  async createInvitation(@Body() body: CreateInvitationBody) {
    return this.permissionsService.createInvitation(body);
  }

  @Get("invitations")
  async listInvitations(
    @Query("organizationId") organizationId: string,
    @Query("status") status?: "pending" | "accepted" | "cancelled",
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.permissionsService.listInvitations(organizationId, status);
  }

  @Post("invitations/resolve")
  async resolveInvitation(@Body() body: { invitationToken: string }) {
    return this.permissionsService.resolveInvitation(body.invitationToken);
  }

  @Post("invitations/accept")
  async acceptInvitation(@Body() body: { invitationToken: string }) {
    return this.permissionsService.acceptInvitation(body.invitationToken);
  }
}
