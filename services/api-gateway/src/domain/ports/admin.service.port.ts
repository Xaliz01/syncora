import type { AuthUser, PermissionCode } from "@syncora/shared";

export interface InviteOrganizationUserBody {
  email: string;
  name?: string;
  role?: "admin" | "member";
  profileId?: string;
  extraPermissions?: PermissionCode[];
  revokedPermissions?: PermissionCode[];
}

export interface UpdateUserPermissionsBody {
  profileId?: string | null;
  extraPermissions?: PermissionCode[];
  revokedPermissions?: PermissionCode[];
}

export interface CreatePermissionProfileForOrgBody {
  name: string;
  description?: string;
  permissions: PermissionCode[];
}

export interface UpdatePermissionProfileForOrgBody {
  name?: string;
  description?: string;
  permissions?: PermissionCode[];
}

export abstract class AbstractAdminService {
  abstract getPermissionsCatalog(): { availablePermissions: PermissionCode[] };
  abstract inviteUser(currentUser: AuthUser, body: InviteOrganizationUserBody): Promise<unknown>;
  abstract listOrganizationUsers(currentUser: AuthUser): Promise<unknown>;
  abstract getOrganizationUser(currentUser: AuthUser, userId: string): Promise<unknown>;
  abstract assignUserPermissions(
    currentUser: AuthUser,
    userId: string,
    body: UpdateUserPermissionsBody,
  ): Promise<unknown>;
  abstract createPermissionProfile(
    currentUser: AuthUser,
    body: CreatePermissionProfileForOrgBody,
  ): Promise<unknown>;
  abstract listPermissionProfiles(currentUser: AuthUser): Promise<unknown>;
  abstract getPermissionProfile(currentUser: AuthUser, profileId: string): Promise<unknown>;
  abstract updatePermissionProfile(
    currentUser: AuthUser,
    profileId: string,
    body: UpdatePermissionProfileForOrgBody,
  ): Promise<unknown>;
  abstract deletePermissionProfile(currentUser: AuthUser, profileId: string): Promise<unknown>;
  abstract listInvitations(
    currentUser: AuthUser,
    status?: "pending" | "accepted" | "cancelled",
  ): Promise<unknown>;
}
