import type {
  InvitationResponse,
  PermissionCode,
  PermissionProfileResponse,
  UserPermissionAssignmentResponse,
  UserResponse
} from "@syncora/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

export interface ManagedOrganizationUser extends UserResponse {
  permissions: PermissionCode[];
  permissionAssignment: UserPermissionAssignmentResponse;
}

export interface InviteOrganizationUserPayload {
  email: string;
  name?: string;
  role?: "admin" | "member";
  profileId?: string;
  extraPermissions?: PermissionCode[];
  revokedPermissions?: PermissionCode[];
}

export interface UpdateOrganizationUserPermissionsPayload {
  profileId?: string | null;
  extraPermissions?: PermissionCode[];
  revokedPermissions?: PermissionCode[];
}

export interface CreatePermissionProfilePayload {
  name: string;
  description?: string;
  permissions: PermissionCode[];
}

async function adminRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export function getPermissionsCatalog() {
  return adminRequest<{ availablePermissions: PermissionCode[] }>(
    "GET",
    "/admin/permissions/catalog"
  );
}

export function listPermissionProfiles() {
  return adminRequest<PermissionProfileResponse[]>("GET", "/admin/permission-profiles");
}

export function getPermissionProfile(profileId: string) {
  return adminRequest<PermissionProfileResponse>("GET", `/admin/permission-profiles/${profileId}`);
}

export function createPermissionProfile(payload: CreatePermissionProfilePayload) {
  return adminRequest<PermissionProfileResponse>("POST", "/admin/permission-profiles", payload);
}

export function updatePermissionProfile(
  profileId: string,
  payload: Partial<CreatePermissionProfilePayload>
) {
  return adminRequest<PermissionProfileResponse>(
    "PATCH",
    `/admin/permission-profiles/${profileId}`,
    payload
  );
}

export function deletePermissionProfile(profileId: string) {
  return adminRequest<{ deleted: true }>("DELETE", `/admin/permission-profiles/${profileId}`);
}

export function listOrganizationUsers() {
  return adminRequest<{ users: ManagedOrganizationUser[] }>("GET", "/admin/users");
}

export function getOrganizationUser(userId: string) {
  return adminRequest<{ user: ManagedOrganizationUser }>("GET", `/admin/users/${userId}`);
}

export function inviteOrganizationUser(payload: InviteOrganizationUserPayload) {
  return adminRequest<{
    invitedUser: UserResponse;
    assignment: UserPermissionAssignmentResponse;
    invitation: InvitationResponse;
  }>("POST", "/admin/users/invite", payload);
}

export function updateOrganizationUserPermissions(
  userId: string,
  payload: UpdateOrganizationUserPermissionsPayload
) {
  return adminRequest<{
    userId: string;
    role: "admin" | "member";
    assignment: UserPermissionAssignmentResponse;
    effectivePermissions: PermissionCode[];
  }>("PUT", `/admin/users/${userId}/permissions`, payload);
}

export function listInvitations(status?: "pending" | "accepted" | "cancelled") {
  const query = status ? `?status=${status}` : "";
  return adminRequest<InvitationResponse[]>("GET", `/admin/invitations${query}`);
}
