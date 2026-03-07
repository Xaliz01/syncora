import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AssignUserPermissionsBody,
  AuthUser,
  CreateInvitationBody,
  CreateInvitedUserBody,
  CreatePermissionProfileBody,
  EffectivePermissionsResponse,
  InvitationResponse,
  PermissionCode,
  UpdatePermissionProfileBody,
  UserPermissionAssignmentResponse,
  UserResponse
} from "@syncora/shared";
import { AVAILABLE_PERMISSION_CODES } from "@syncora/shared";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL =
  process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

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

@Injectable()
export class AdminService {
  constructor(private readonly httpService: HttpService) {}

  getPermissionsCatalog() {
    return {
      availablePermissions: AVAILABLE_PERMISSION_CODES
    };
  }

  async inviteUser(currentUser: AuthUser, body: InviteOrganizationUserBody) {
    const createInvitedUserBody: CreateInvitedUserBody = {
      organizationId: currentUser.organizationId,
      email: body.email,
      name: body.name,
      role: body.role ?? "member",
      invitedByUserId: currentUser.id
    };
    const invitedUser = await this.callUsersService<UserResponse>({
      method: "post",
      path: "/users/invite",
      body: createInvitedUserBody
    });

    const assignment = await this.callPermissionsService<UserPermissionAssignmentResponse>({
      method: "put",
      path: `/assignments/${invitedUser.id}`,
      body: {
        organizationId: currentUser.organizationId,
        userId: invitedUser.id,
        profileId: body.profileId ?? null,
        extraPermissions: body.extraPermissions ?? [],
        revokedPermissions: body.revokedPermissions ?? []
      } satisfies AssignUserPermissionsBody
    });

    const invitation = await this.callPermissionsService<InvitationResponse>({
      method: "post",
      path: "/invitations",
      body: {
        organizationId: currentUser.organizationId,
        invitedUserId: invitedUser.id,
        invitedEmail: invitedUser.email,
        invitedName: invitedUser.name,
        invitedByUserId: currentUser.id,
        profileId: body.profileId,
        extraPermissions: body.extraPermissions ?? [],
        revokedPermissions: body.revokedPermissions ?? []
      } satisfies CreateInvitationBody
    });

    return {
      invitedUser,
      assignment,
      invitation
    };
  }

  async listOrganizationUsers(currentUser: AuthUser) {
    const users = await this.callUsersService<UserResponse[]>({
      method: "get",
      path: "/users",
      query: { organizationId: currentUser.organizationId }
    });

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [assignment, effectivePermissions] = await Promise.all([
          this.callPermissionsService<UserPermissionAssignmentResponse>({
            method: "get",
            path: `/assignments/${user.id}`,
            query: { organizationId: currentUser.organizationId }
          }),
          this.callPermissionsService<EffectivePermissionsResponse>({
            method: "post",
            path: "/permissions/effective",
            body: {
              organizationId: currentUser.organizationId,
              userId: user.id,
              role: user.role
            }
          })
        ]);
        return {
          ...user,
          permissions: effectivePermissions.permissions,
          permissionAssignment: assignment
        };
      })
    );
    return {
      users: enrichedUsers
    };
  }

  async assignUserPermissions(
    currentUser: AuthUser,
    userId: string,
    body: UpdateUserPermissionsBody
  ) {
    const targetUser = await this.callUsersService<UserResponse>({
      method: "get",
      path: `/users/${userId}`
    });
    if (targetUser.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException("Cannot manage user from another organization");
    }

    const assignment = await this.callPermissionsService<UserPermissionAssignmentResponse>({
      method: "put",
      path: `/assignments/${userId}`,
      body: {
        organizationId: currentUser.organizationId,
        userId,
        profileId: body.profileId ?? null,
        extraPermissions: body.extraPermissions ?? [],
        revokedPermissions: body.revokedPermissions ?? []
      } satisfies AssignUserPermissionsBody
    });

    const effectivePermissions = await this.callPermissionsService<EffectivePermissionsResponse>({
      method: "post",
      path: "/permissions/effective",
      body: {
        organizationId: currentUser.organizationId,
        userId,
        role: targetUser.role
      }
    });

    return {
      userId,
      role: targetUser.role,
      assignment,
      effectivePermissions: effectivePermissions.permissions
    };
  }

  async createPermissionProfile(
    currentUser: AuthUser,
    body: CreatePermissionProfileForOrgBody
  ) {
    return this.callPermissionsService({
      method: "post",
      path: "/profiles",
      body: {
        organizationId: currentUser.organizationId,
        name: body.name,
        description: body.description,
        permissions: body.permissions
      } satisfies CreatePermissionProfileBody
    });
  }

  async listPermissionProfiles(currentUser: AuthUser) {
    return this.callPermissionsService({
      method: "get",
      path: "/profiles",
      query: { organizationId: currentUser.organizationId }
    });
  }

  async updatePermissionProfile(
    currentUser: AuthUser,
    profileId: string,
    body: UpdatePermissionProfileForOrgBody
  ) {
    return this.callPermissionsService({
      method: "patch",
      path: `/profiles/${profileId}`,
      body: {
        organizationId: currentUser.organizationId,
        ...body
      } satisfies UpdatePermissionProfileBody
    });
  }

  async deletePermissionProfile(currentUser: AuthUser, profileId: string) {
    return this.callPermissionsService({
      method: "delete",
      path: `/profiles/${profileId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async listInvitations(
    currentUser: AuthUser,
    status?: "pending" | "accepted" | "cancelled"
  ) {
    return this.callPermissionsService({
      method: "get",
      path: "/invitations",
      query: { organizationId: currentUser.organizationId, status }
    });
  }

  private async callUsersService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${USERS_URL}${params.path}`,
          data: params.body,
          params: params.query
        })
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private async callPermissionsService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${PERMISSIONS_URL}${params.path}`,
          data: params.body,
          params: params.query
        })
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message ?? "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
