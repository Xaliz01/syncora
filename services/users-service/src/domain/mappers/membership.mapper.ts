import type { OrganizationMembershipResponse } from "@planwise/shared";
import type { OrganizationMembershipDocument } from "../../persistence/organization-membership.schema";

export function toOrganizationMembershipResponse(
  doc: OrganizationMembershipDocument,
): OrganizationMembershipResponse {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    organizationId: doc.organizationId,
    role: doc.role as OrganizationMembershipResponse["role"],
    membershipStatus: doc.membershipStatus as OrganizationMembershipResponse["membershipStatus"],
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
  };
}
