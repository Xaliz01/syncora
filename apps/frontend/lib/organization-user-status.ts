import type { OrganizationMembershipStatus, UserResponse } from "@planwise/shared";
import { membershipCountsTowardUserSeat } from "@planwise/shared";

const USER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  invited: "Invité",
  pending: "En attente",
  inactive: "Inactif",
  suspended: "Suspendu",
  disabled: "Désactivé",
};

function membershipStatusOf(user: UserResponse): OrganizationMembershipStatus | undefined {
  return user.organizationMembershipStatus;
}

/** Libellé « statut » pour l’admin org : invitation / désactivation portées par `organizationMembershipStatus`. */
export function getOrganizationUserStatusLabel(user: UserResponse): string {
  const membershipStatus = membershipStatusOf(user);
  if (membershipStatus === "invited" || user.status === "invited") {
    return USER_STATUS_LABELS.invited;
  }
  if (membershipStatus === "disabled") {
    return USER_STATUS_LABELS.disabled;
  }
  if (membershipStatus === "active") {
    return USER_STATUS_LABELS.active;
  }
  return USER_STATUS_LABELS[user.status] ?? user.status;
}

/** Créneaux consommés (actifs + invitations en attente ; hors désactivés). */
export function countOrganizationUserSeats(users: UserResponse[]): number {
  return users.filter((user) => membershipCountsTowardUserSeat(user.organizationMembershipStatus))
    .length;
}
