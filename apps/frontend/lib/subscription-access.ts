import type { AddonCode, AuthUser, PermissionCode } from "@planwise/shared";

export const SUBSCRIPTION_ACTIVE_PERMISSION: PermissionCode = "subscription.active";

export function hasActiveSubscriptionAccess(user: AuthUser | null | undefined): boolean {
  return !!user?.permissions?.includes(SUBSCRIPTION_ACTIVE_PERMISSION);
}

/** Après connexion / inscription : techniciens → /my-day, sinon tableau de bord. */
export function postAuthHomePath(user: AuthUser): string {
  if (!hasActiveSubscriptionAccess(user)) return "/subscription";
  if (user.technicianId) return "/my-day";
  return "/";
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
