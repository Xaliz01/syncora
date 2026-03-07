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
import { AdminService } from "../../domain/admin.service";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { AdminRoleGuard } from "../../infrastructure/admin-role.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import type {
  CreatePermissionProfileForOrgBody,
  InviteOrganizationUserBody,
  UpdatePermissionProfileForOrgBody,
  UpdateUserPermissionsBody
} from "../../domain/admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("permissions/catalog")
  getPermissionsCatalog() {
    return this.adminService.getPermissionsCatalog();
  }

  @Post("users/invite")
  async inviteUser(
    @CurrentUser() user: AuthUser,
    @Body() body: InviteOrganizationUserBody
  ) {
    return this.adminService.inviteUser(user, body);
  }

  @Get("users")
  async listOrganizationUsers(@CurrentUser() user: AuthUser) {
    return this.adminService.listOrganizationUsers(user);
  }

  @Put("users/:userId/permissions")
  async assignUserPermissions(
    @CurrentUser() user: AuthUser,
    @Param("userId") userId: string,
    @Body() body: UpdateUserPermissionsBody
  ) {
    return this.adminService.assignUserPermissions(user, userId, body);
  }

  @Post("permission-profiles")
  async createPermissionProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePermissionProfileForOrgBody
  ) {
    return this.adminService.createPermissionProfile(user, body);
  }

  @Get("permission-profiles")
  async listPermissionProfiles(@CurrentUser() user: AuthUser) {
    return this.adminService.listPermissionProfiles(user);
  }

  @Patch("permission-profiles/:profileId")
  async updatePermissionProfile(
    @CurrentUser() user: AuthUser,
    @Param("profileId") profileId: string,
    @Body() body: UpdatePermissionProfileForOrgBody
  ) {
    return this.adminService.updatePermissionProfile(user, profileId, body);
  }

  @Delete("permission-profiles/:profileId")
  async deletePermissionProfile(
    @CurrentUser() user: AuthUser,
    @Param("profileId") profileId: string
  ) {
    return this.adminService.deletePermissionProfile(user, profileId);
  }

  @Get("invitations")
  async listInvitations(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: "pending" | "accepted" | "cancelled"
  ) {
    return this.adminService.listInvitations(user, status);
  }
}
