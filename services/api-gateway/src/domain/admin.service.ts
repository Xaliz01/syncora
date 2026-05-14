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
  OrganizationMembershipResponse,
  UpdatePermissionProfileBody,
  UserPermissionAssignmentResponse,
  UserResponse
} from "@syncora/shared";
import { ASSIGNABLE_PERMISSION_CODES } from "@syncora/shared";
import {
  AbstractAdminService,
  type InviteOrganizationUserBody,
  type UpdateUserPermissionsBody,
  type CreatePermissionProfileForOrgBody,
  type UpdatePermissionProfileForOrgBody
} from "./ports/admin.service.port";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL =
  process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

@Injectable()
export class AdminService extends AbstractAdminService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  getPermissionsCatalog() {
    return {
      /** Droits configurables (profils, invitations) — hors indicateurs système comme `subscription.active`. */
      availablePermissions: [...ASSIGNABLE_PERMISSION_CODES]
    };
  }

  async inviteUser(currentUser: AuthUser, body: InviteOrganizationUserBody) {
    const invitedRole = body.role ?? "member";
    if (
      invitedRole === "admin" &&
      (body.profileId || (body.extraPermissions?.length ?? 0) > 0 || (body.revokedPermissions?.length ?? 0) > 0)
    ) {
      throw new BadRequestException(
        "Les administrateurs d'organisation ont tous les droits ; les profils et permissions personnalisées ne sont pas autorisés"
      );
    }

    const createInvitedUserBody: CreateInvitedUserBody = {
      organizationId: currentUser.organizationId,
      email: body.email,
      name: body.name,
      role: invitedRole,
      invitedByUserId: currentUser.id
    };
    const invitedUser = await this.callUsersService<UserResponse>({
      method: "post",
      path: "/users/invite",
      body: createInvitedUserBody
    });

    const assignment =
      invitedUser.role === "admin"
        ? {
            organizationId: currentUser.organizationId,
            userId: invitedUser.id,
            extraPermissions: [],
            revokedPermissions: [],
            effectivePermissions: [...ASSIGNABLE_PERMISSION_CODES]
          }
        : await this.callPermissionsService<UserPermissionAssignmentResponse>({
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
        profileId: invitedUser.role === "admin" ? undefined : body.profileId,
        extraPermissions: invitedUser.role === "admin" ? [] : body.extraPermissions ?? [],
        revokedPermissions: invitedUser.role === "admin" ? [] : body.revokedPermissions ?? []
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

  async getOrganizationUser(currentUser: AuthUser, userId: string) {
    const user = await this.callUsersService<UserResponse>({
      method: "get",
      path: `/users/${userId}`
    });
    if (user.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException("Impossible d'accéder à un utilisateur d'une autre organisation");
    }

    const [memberships, assignment, effectivePermissions] = await Promise.all([
      this.callUsersService<OrganizationMembershipResponse[]>({
        method: "get",
        path: `/users/${userId}/organization-memberships`
      }),
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

    const membershipForOrg = memberships.find(
      (row) => row.organizationId === currentUser.organizationId
    );

    return {
      user: {
        ...user,
        organizationMembershipStatus: membershipForOrg?.membershipStatus,
        permissions: effectivePermissions.permissions,
        permissionAssignment: assignment
      }
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
      throw new ForbiddenException("Impossible de gérer un utilisateur d'une autre organisation");
    }
    if (targetUser.role === "admin") {
      throw new BadRequestException(
        "Les administrateurs d'organisation ont tous les droits et ne peuvent pas avoir de profils/permissions personnalisés"
      );
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

  async getPermissionProfile(currentUser: AuthUser, profileId: string) {
    return this.callPermissionsService({
      method: "get",
      path: `/profiles/${profileId}`,
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
