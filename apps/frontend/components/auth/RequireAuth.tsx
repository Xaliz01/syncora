"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import {
  hasActiveSubscriptionAccess,
  isOnboardingRoute,
  isOrganizationSubscriptionRoute,
  postAuthHomePath,
} from "@/lib/subscription-access";
import { buildLoginHref } from "@/lib/auth-return-url";
import * as accountApi from "@/lib/account.api";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const subscriptionOk = hasActiveSubscriptionAccess(user);
  const onOnboarding = isOnboardingRoute(pathname);
  const eligibleForOnboarding = Boolean(user?.isFoundingAdmin);

  const prefsQueryEnabled = Boolean(
    isReady && isAuthenticated && user && subscriptionOk && eligibleForOnboarding,
  );

  const { data: prefsData, isPending: prefsPending } = useQuery({
    queryKey: ["account-preferences", user?.id, user?.organizationId],
    queryFn: () => accountApi.getPreferences(),
    enabled: prefsQueryEnabled,
    staleTime: 30_000,
  });

  /** Uniquement true si les prefs l’affirment explicitement (fail-closed sinon). */
  const onboardingDone = prefsData?.preferences.onboardingProfileCompleted === true;

  /**
   * Fondateur + essai/abo actif : bloquer l’app tant que l’onboarding n’est pas terminé.
   * Ne pas exiger `prefsData` — sans prefs (chargement / erreur), on bloque (évite dashboard + démo).
   */
  const mustCompleteOnboarding = Boolean(
    subscriptionOk && eligibleForOnboarding && !onboardingDone,
  );

  React.useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      const returnPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname;
      router.replace(buildLoginHref(returnPath));
    }
  }, [isReady, isAuthenticated, router, pathname]);

  React.useEffect(() => {
    if (!isReady || !isAuthenticated || !user) return;
    if (subscriptionOk) return;
    if (isOrganizationSubscriptionRoute(pathname)) return;
    router.replace("/subscription");
  }, [isReady, isAuthenticated, user, pathname, router, subscriptionOk]);

  React.useEffect(() => {
    if (!isReady || !isAuthenticated || !user || !subscriptionOk) return;
    if (onOnboarding && !eligibleForOnboarding) {
      router.replace(postAuthHomePath(user));
      return;
    }
    if (!eligibleForOnboarding) return;
    if (mustCompleteOnboarding && !onOnboarding) {
      router.replace("/onboarding");
    }
    // La sortie de /onboarding (accueil, fiche client…) est gérée par la page elle-même
    // pour éviter une course avec un router.replace concurrent.
  }, [
    isReady,
    isAuthenticated,
    user,
    subscriptionOk,
    eligibleForOnboarding,
    mustCompleteOnboarding,
    onOnboarding,
    router,
  ]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user && !subscriptionOk && !isOrganizationSubscriptionRoute(pathname)) {
    return null;
  }

  // Ne pas monter le dashboard (ni carte démo) tant que l’onboarding fondateur n’est pas fait.
  if (mustCompleteOnboarding && !onOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  // Sur /onboarding, attendre les prefs si besoin (évite un flash du formulaire si déjà terminé).
  if (onOnboarding && eligibleForOnboarding && prefsQueryEnabled && prefsPending && !prefsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  return <>{children}</>;
}
