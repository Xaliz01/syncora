import type {
  InvitationResponse,
  PermissionCode,
  PermissionProfileResponse,
  UserPermissionAssignmentResponse,
  UserResponse
} from "@syncora/shared";
import { getToken } from "./auth.api";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

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
  const token = getToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { message?: string | string[] }).message;
    if (Array.isArray(message)) throw new Error(message.join(", "));
    throw new Error(message ?? "Erreur API");
  }

  return response.json() as Promise<TResponse>;
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
