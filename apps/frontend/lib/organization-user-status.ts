import type { UserResponse } from "@syncora/shared";

const USER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  invited: "Invité",
  pending: "En attente",
  inactive: "Inactif",
  suspended: "Suspendu"
};

/** Libellé « statut » pour l’admin org : invitation portée par `organizationMembershipStatus`, repli legacy sur `user.status`. */
export function getOrganizationUserStatusLabel(user: UserResponse): string {
  if (user.organizationMembershipStatus === "invited") {
    return USER_STATUS_LABELS.invited;
  }
  if (user.status === "invited") {
    return USER_STATUS_LABELS.invited;
  }
  return USER_STATUS_LABELS[user.status] ?? user.status;
}
