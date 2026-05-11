import type { UserRole } from "./auth";

/** Table de jointure utilisateur ↔ organisation (users-service). */
export interface OrganizationMembershipResponse {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  membershipStatus: "active" | "invited";
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganizationMembershipBody {
  organizationId: string;
  role: UserRole;
  membershipStatus?: "active" | "invited";
}
