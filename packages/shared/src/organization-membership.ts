import type { UserRole } from "./auth";

/** Statut du rattachement utilisateur ↔ organisation. */
export type OrganizationMembershipStatus = "active" | "invited" | "disabled";

/** Statuts qui consomment un créneau d’abonnement. */
export const SEAT_COUNTING_MEMBERSHIP_STATUSES: readonly OrganizationMembershipStatus[] = [
  "active",
  "invited",
] as const;

export function membershipCountsTowardUserSeat(
  status: OrganizationMembershipStatus | string | undefined | null,
): boolean {
  return status === "active" || status === "invited" || status == null || status === "";
}

/** Table de jointure utilisateur ↔ organisation (users-service). */
export interface OrganizationMembershipResponse {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  membershipStatus: OrganizationMembershipStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrganizationMembershipBody {
  organizationId: string;
  role: UserRole;
  membershipStatus?: OrganizationMembershipStatus;
}

export interface SetOrganizationMembershipStatusBody {
  organizationId: string;
}
