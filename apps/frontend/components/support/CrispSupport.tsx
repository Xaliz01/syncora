"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useOrganization } from "@/lib/organization";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import * as supportApi from "@/lib/support.api";
import {
  bootCrispWithUser,
  getCrispWebsiteId,
  shutdownCrispSession,
  type CrispUserIdentity,
} from "@/lib/crisp-client";
import { useCookieConsentSupport } from "@/components/legal/CookieConsentBanner";

/** Aperçu facture démo (souvent en iframe) : pas de second bubble Crisp. */
function shouldSuppressCrispChat(pathname: string | null): boolean {
  if (pathname?.startsWith("/demo-invoice")) return true;
  if (typeof window !== "undefined" && window.self !== window.top) return true;
  return false;
}

function buildCrispIdentity(
  user: NonNullable<ReturnType<typeof useAuth>["user"]>,
  organizationName: string | undefined,
  subscription: Awaited<ReturnType<typeof subscriptionsApi.getSubscriptionCurrent>> | undefined,
  signature?: string,
): CrispUserIdentity {
  return {
    tokenId: user.id,
    email: user.email,
    nickname: user.name?.trim() || user.email,
    signature,
    sessionData: {
      user_id: user.id,
      organization_id: user.organizationId,
      organization: organizationName?.trim() || user.organizationId,
      role: user.role === "admin" ? "Administrateur" : "Membre",
      plan: subscription?.planName ?? "unknown",
      subscription_status: subscription?.status ?? "unknown",
    },
  };
}

export function CrispSupport() {
  const pathname = usePathname();
  const { user, isAuthenticated, isReady } = useAuth();
  const { activeOrganization } = useOrganization();
  const websiteId = getCrispWebsiteId();
  const supportConsent = useCookieConsentSupport();
  const suppressChat = shouldSuppressCrispChat(pathname);

  const { data: subscription } = useQuery({
    queryKey: ["subscription-current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent(),
    enabled: Boolean(user && websiteId && !suppressChat),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (suppressChat) {
      shutdownCrispSession();
      return;
    }

    if (!isReady || !websiteId || !isAuthenticated || !user || !supportConsent) {
      if (isReady && (!isAuthenticated || !supportConsent)) {
        shutdownCrispSession();
      }
      return;
    }

    let cancelled = false;

    const boot = async (signature?: string) => {
      await bootCrispWithUser(
        websiteId,
        buildCrispIdentity(user, activeOrganization?.name, subscription, signature),
      );
    };

    void (async () => {
      try {
        await boot();
        if (cancelled) return;

        try {
          const identity = await supportApi.getCrispIdentity();
          if (!cancelled && identity.signature) {
            await boot(identity.signature);
          }
        } catch {
          /* signature optionnelle si vérification Crisp désactivée */
        }
      } catch {
        /* évite de bloquer l'app si Crisp est indisponible */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    suppressChat,
    websiteId,
    isReady,
    isAuthenticated,
    user,
    activeOrganization?.name,
    subscription,
    supportConsent,
  ]);

  return null;
}
