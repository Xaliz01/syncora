import type { AddonCode, AuthUser, PermissionCode } from "@syncora/shared";

export const SUBSCRIPTION_ACTIVE_PERMISSION: PermissionCode = "subscription.active";

export function hasActiveSubscriptionAccess(user: AuthUser | null | undefined): boolean {
  return !!user?.permissions?.includes(SUBSCRIPTION_ACTIVE_PERMISSION);
}

/** Après connexion / inscription : tableau de bord si abonnement actif, sinon page abonnement. */
export function postAuthHomePath(user: AuthUser): string {
  return hasActiveSubscriptionAccess(user) ? "/" : "/subscription";
}

export function isSubscriptionRoute(pathname: string): boolean {
  return pathname === "/subscription" || pathname.startsWith("/subscription/");
}

/** Query `modify` : ouvre la modale d’options sur Mon abonnement avec l’addon présélectionné. */
export function subscriptionModifyAddonsPath(addonCode: AddonCode): string {
  return `/subscription?modify=${encodeURIComponent(addonCode)}`;
}

/** Routes accessibles sans abonnement actif (organisation, facturation, compte). */
export function isOrganizationSubscriptionRoute(pathname: string): boolean {
  return (
    pathname === "/organization" ||
    pathname.startsWith("/organization/") ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    isSubscriptionRoute(pathname)
  );
}
