import type {
  AssignUserPermissionsBody,
  CreateInvitationBody,
  CreatePermissionProfileBody,
  EffectivePermissionsResponse,
  InvitationResponse,
  PermissionProfileResponse,
  ResolveEffectivePermissionsBody,
  UpdatePermissionProfileBody,
  UserPermissionAssignmentResponse
} from "@syncora/shared";

export abstract class AbstractPermissionsService {
  abstract createProfile(body: CreatePermissionProfileBody): Promise<PermissionProfileResponse>;
  abstract listProfiles(organizationId: string): Promise<PermissionProfileResponse[]>;
  abstract findProfileById(
    id: string,
    organizationId: string
  ): Promise<PermissionProfileResponse>;
  abstract updateProfile(
    id: string,
    body: UpdatePermissionProfileBody
  ): Promise<PermissionProfileResponse>;
  abstract deleteProfile(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract assignUserPermissions(
    body: AssignUserPermissionsBody
  ): Promise<UserPermissionAssignmentResponse>;
  abstract getUserAssignment(
    organizationId: string,
    userId: string
  ): Promise<UserPermissionAssignmentResponse>;
  abstract resolveEffectivePermissions(
    body: ResolveEffectivePermissionsBody
  ): Promise<EffectivePermissionsResponse>;
  abstract createInvitation(body: CreateInvitationBody): Promise<InvitationResponse>;
  abstract listInvitations(
    organizationId: string,
    status?: "pending" | "accepted" | "cancelled"
  ): Promise<InvitationResponse[]>;
  abstract resolveInvitation(invitationToken: string): Promise<InvitationResponse>;
  abstract acceptInvitation(invitationToken: string): Promise<InvitationResponse>;
}
