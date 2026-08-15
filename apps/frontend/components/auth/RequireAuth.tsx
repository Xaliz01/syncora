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
import { OrganizationSwitchOverlay } from "@/components/organization/OrganizationSwitchOverlay";

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

  const {
    data: prefsData,
    isPending: prefsPending,
    isFetched,
  } = useQuery({
    queryKey: ["account-preferences", user?.id, user?.organizationId],
    queryFn: () => accountApi.getPreferences(),
    enabled: prefsQueryEnabled,
    staleTime: 30_000,
  });

  /** Prefs reçues (ou query inactive). Tant que pending sans cache → décision inconnue. */
  const prefsSettled = !prefsQueryEnabled || isFetched || !prefsPending;
  const onboardingDone = prefsData?.preferences.onboardingProfileCompleted === true;
  /** Uniquement après réponse prefs : on sait qu’il faut l’onboarding. */
  const onboardingIncomplete = Boolean(
    prefsQueryEnabled && prefsSettled && prefsData && !onboardingDone,
  );
  /** Fondateur + abo : ne pas monter l’app ni rediriger vers /onboarding tant que prefs inconnues. */
  const awaitingOnboardingDecision = Boolean(prefsQueryEnabled && !prefsSettled);
  const showSessionLoading =
    !isReady || awaitingOnboardingDecision || (onboardingIncomplete && !onOnboarding);

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
    // Ne rediriger vers /onboarding que lorsque les prefs confirment l’incomplet
    // (évite un flash onboarding pour un fondateur déjà onboardé).
    if (onboardingIncomplete && !onOnboarding) {
      router.replace("/onboarding");
    }
  }, [
    isReady,
    isAuthenticated,
    user,
    subscriptionOk,
    eligibleForOnboarding,
    onboardingIncomplete,
    onOnboarding,
    router,
  ]);

  if (!isReady) {
    return (
      <OrganizationSwitchOverlay
        visible
        title="Chargement"
        detail="Préparation de votre session…"
        ariaLabel="Chargement de la session"
      />
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user && !subscriptionOk && !isOrganizationSubscriptionRoute(pathname)) {
    return null;
  }

  if (showSessionLoading) {
    return (
      <OrganizationSwitchOverlay
        visible
        title="Préparation de votre espace"
        detail={
          awaitingOnboardingDecision
            ? "Chargement de vos préférences…"
            : "Redirection vers l’accueil…"
        }
        ariaLabel="Chargement de votre espace"
      />
    );
  }

  return <>{children}</>;
}
