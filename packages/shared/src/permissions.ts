/** Contrats API permissions-service (profils, invitations, affectations) */

/** Droits configurables via profils et affectations (hors abonnement). */
export const ASSIGNABLE_PERMISSION_CODES = [
  "organizations.read",
  "organizations.create",
  "organizations.update",
  "users.read",
  "users.invite",
  "users.assign_profile",
  "users.manage_permissions",
  "profiles.read",
  "profiles.create",
  "profiles.update",
  "profiles.delete",
  "cases.read",
  "cases.create",
  "cases.update",
  "cases.delete",
  "cases.assign",
  "customers.read",
  "customers.create",
  "customers.update",
  "customers.delete",
  "fleet.vehicles.read",
  "fleet.vehicles.create",
  "fleet.vehicles.update",
  "fleet.vehicles.delete",
  "fleet.vehicles.assign",
  "fleet.technicians.read",
  "fleet.technicians.create",
  "fleet.technicians.update",
  "fleet.technicians.delete",
  "fleet.technicians.create_user",
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
  "stock.interventions.create",
  "subscriptions.manage_billing",
] as const;

export type AssignablePermissionCode = (typeof ASSIGNABLE_PERMISSION_CODES)[number];

/** Inclut les droits dérivés du contexte (ex. abonnement actif). */
export const AVAILABLE_PERMISSION_CODES = [
  ...ASSIGNABLE_PERMISSION_CODES,
  "subscription.active",
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
