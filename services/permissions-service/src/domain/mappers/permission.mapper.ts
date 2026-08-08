import type {
  InvitationResponse,
  PermissionCode,
  PermissionProfileResponse,
  UserPermissionAssignmentResponse,
} from "@planwise/shared";
import type { PermissionProfileDocument } from "../../persistence/permission-profile.schema";
import type { UserPermissionAssignmentDocument } from "../../persistence/user-permission-assignment.schema";
import type { InvitationDocument } from "../../persistence/invitation.schema";

export function toProfileResponse(
  doc: PermissionProfileDocument,
  normalizePermissions: (permissions: PermissionCode[]) => PermissionCode[],
): PermissionProfileResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    description: doc.description,
    permissions: normalizePermissions(doc.permissions as PermissionCode[]),
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}

export function toAssignmentResponse(
  doc: UserPermissionAssignmentDocument,
  profilePermissions: PermissionCode[],
  normalizePermissions: (permissions: PermissionCode[]) => PermissionCode[],
  mergePermissions: (first: PermissionCode[], second: PermissionCode[]) => PermissionCode[],
): UserPermissionAssignmentResponse {
  const extraPermissions = normalizePermissions(doc.extraPermissions as PermissionCode[]);
  const revokedPermissions = normalizePermissions(doc.revokedPermissions as PermissionCode[]);
  const effectivePermissions = mergePermissions(profilePermissions, extraPermissions).filter(
    (permission) => !revokedPermissions.includes(permission),
  );
  return {
    organizationId: doc.organizationId,
    userId: doc.userId,
    profileId: doc.profileId,
    extraPermissions,
    revokedPermissions,
    effectivePermissions: normalizePermissions(effectivePermissions),
    updatedAt: doc.get("updatedAt")?.toISOString(),
  };
}

export function toInvitationResponse(
  doc: InvitationDocument,
  normalizePermissions: (permissions: PermissionCode[]) => PermissionCode[],
): InvitationResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    invitedUserId: doc.invitedUserId,
    invitedEmail: doc.invitedEmail,
    invitedName: doc.invitedName,
    invitedByUserId: doc.invitedByUserId,
    status: doc.status,
    invitationToken: doc.invitationToken,
    profileId: doc.profileId,
    extraPermissions: normalizePermissions(doc.extraPermissions as PermissionCode[]),
    revokedPermissions: normalizePermissions(doc.revokedPermissions as PermissionCode[]),
    createdAt: doc.get("createdAt")?.toISOString(),
    acceptedAt: doc.acceptedAt?.toISOString(),
  };
}
