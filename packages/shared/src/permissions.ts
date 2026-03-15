/** Contrats API permissions-service (profils, invitations, affectations) */

export const AVAILABLE_PERMISSION_CODES = [
  "users.read",
  "users.invite",
  "users.assign_profile",
  "users.manage_permissions",
  "permission_profiles.read",
  "permission_profiles.create",
  "permission_profiles.update",
  "permission_profiles.delete",
  "cases.read",
  "cases.create",
  "cases.update",
  "cases.delete",
  "cases.assign",
  "case_templates.read",
  "case_templates.create",
  "case_templates.update",
  "case_templates.delete",
  "interventions.read",
  "interventions.create",
  "interventions.update",
  "interventions.delete",
  "vehicles.read",
  "vehicles.create",
  "vehicles.update",
  "vehicles.delete",
  "technicians.read",
  "technicians.create",
  "technicians.update",
  "technicians.delete",
  "teams.read",
  "teams.create",
  "teams.update",
  "teams.delete",
  "agences.read",
  "agences.create",
  "agences.update",
  "agences.delete",
  "stock.articles.read",
  "stock.articles.create",
  "stock.articles.update",
  "stock.articles.delete",
  "stock.movements.read",
  "stock.movements.create",
  "stock.interventions.read",
  "stock.interventions.create"
] as const;

export type PermissionCode = (typeof AVAILABLE_PERMISSION_CODES)[number];

export interface PermissionProfileResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissions: PermissionCode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePermissionProfileBody {
  organizationId: string;
  name: string;
  description?: string;
  permissions: PermissionCode[];
}

export interface UpdatePermissionProfileBody {
  organizationId: string;
  name?: string;
  description?: string;
  permissions?: PermissionCode[];
}

export interface AssignUserPermissionsBody {
  organizationId: string;
  userId: string;
  profileId?: string | null;
  extraPermissions?: PermissionCode[];
  revokedPermissions?: PermissionCode[];
}

export interface UserPermissionAssignmentResponse {
  organizationId: string;
  userId: string;
  profileId?: string;
  extraPermissions: PermissionCode[];
  revokedPermissions: PermissionCode[];
  effectivePermissions: PermissionCode[];
  updatedAt?: string;
}

export interface CreateInvitationBody {
  organizationId: string;
  invitedUserId: string;
  invitedEmail: string;
  invitedName?: string;
  invitedByUserId: string;
  profileId?: string;
  extraPermissions?: PermissionCode[];
  revokedPermissions?: PermissionCode[];
}

export interface ResolveEffectivePermissionsBody {
  organizationId: string;
  userId: string;
  role: "admin" | "member";
}

export interface EffectivePermissionsResponse {
  permissions: PermissionCode[];
}

export interface InvitationResponse {
  id: string;
  organizationId: string;
  invitedUserId: string;
  invitedEmail: string;
  invitedName?: string;
  invitedByUserId: string;
  status: "pending" | "accepted" | "cancelled";
  invitationToken: string;
  profileId?: string;
  extraPermissions: PermissionCode[];
  revokedPermissions: PermissionCode[];
  createdAt?: string;
  acceptedAt?: string;
}

export interface AcceptInvitationBody {
  invitationToken: string;
  password: string;
  name?: string;
}
