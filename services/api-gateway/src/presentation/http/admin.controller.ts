import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import { AbstractAdminService } from "../../domain/ports/admin.service.port";
import type {
  CreatePermissionProfileForOrgBody,
  InviteOrganizationUserBody,
  UpdatePermissionProfileForOrgBody,
  UpdateUserPermissionsBody
} from "../../domain/ports/admin.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";

@Controller("admin")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class AdminController {
  constructor(private readonly adminService: AbstractAdminService) {}

  @Get("permissions/catalog")
  @RequirePermissions("profiles.read")
  getPermissionsCatalog() {
    return this.adminService.getPermissionsCatalog();
  }

  @Post("users/invite")
  @RequirePermissions("users.invite")
  async inviteUser(
    @CurrentUser() user: AuthUser,
    @Body() body: InviteOrganizationUserBody
  ) {
    return this.adminService.inviteUser(user, body);
  }

  @Get("users")
  @RequirePermissions("users.read")
  async listOrganizationUsers(@CurrentUser() user: AuthUser) {
    return this.adminService.listOrganizationUsers(user);
  }

  @Get("users/:userId")
  @RequirePermissions("users.read")
  async getOrganizationUser(@CurrentUser() user: AuthUser, @Param("userId") userId: string) {
    return this.adminService.getOrganizationUser(user, userId);
  }

  @Put("users/:userId/permissions")
  @RequirePermissions("users.manage_permissions")
  async assignUserPermissions(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
    @Body() body: UpdateUserPermissionsBody
  ) {
    return this.adminService.assignUserPermissions(user, userId, body);
  }

  @Post("permission-profiles")
  @RequirePermissions("profiles.create")
  async createPermissionProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePermissionProfileForOrgBody
  ) {
    return this.adminService.createPermissionProfile(user, body);
  }

  @Get("permission-profiles")
  @RequirePermissions("profiles.read")
  async listPermissionProfiles(@CurrentUser() user: AuthUser) {
    return this.adminService.listPermissionProfiles(user);
  }

  @Get("permission-profiles/:profileId")
  @RequirePermissions("profiles.read")
  async getPermissionProfile(
    @CurrentUser() user: AuthUser,
    @Param("profileId") profileId: string
  ) {
    return this.adminService.getPermissionProfile(user, profileId);
  }

  @Patch("permission-profiles/:profileId")
  @RequirePermissions("profiles.update")
  async updatePermissionProfile(
    @CurrentUser() user: AuthUser,
    @Param("profileId") profileId: string,
    @Body() body: UpdatePermissionProfileForOrgBody
  ) {
    return this.adminService.updatePermissionProfile(user, profileId, body);
  }

  @Delete("permission-profiles/:profileId")
  @RequirePermissions("profiles.delete")
  async deletePermissionProfile(
    @CurrentUser() user: AuthUser,
    @Param("profileId") profileId: string
  ) {
    return this.adminService.deletePermissionProfile(user, profileId);
  }

  @Get("invitations")
  @RequirePermissions("users.invite")
  async listInvitations(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: "pending" | "accepted" | "cancelled"
  ) {
    return this.adminService.listInvitations(user, status);
  }
}
