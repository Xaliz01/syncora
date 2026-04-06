import type { AuthUser, PermissionCode } from "@syncora/shared";

export const SUBSCRIPTION_ACTIVE_PERMISSION: PermissionCode = "subscription.active";

export function hasActiveSubscriptionAccess(user: AuthUser | null | undefined): boolean {
  return !!user?.permissions?.includes(SUBSCRIPTION_ACTIVE_PERMISSION);
}

/** Après connexion / inscription : tableau de bord si abonnement actif, sinon page abonnement. */
export function postAuthHomePath(user: AuthUser): string {
  return hasActiveSubscriptionAccess(user) ? "/" : "/organization";
}

export function isOrganizationSubscriptionRoute(pathname: string): boolean {
  return pathname === "/organization" || pathname.startsWith("/organization/");
}
