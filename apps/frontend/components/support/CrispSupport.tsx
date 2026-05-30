"use client";

import { useEffect, useRef } from "react";
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
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const websiteId = getCrispWebsiteId();
  const boundSessionRef = useRef<string | null>(null);

  const { data: subscription } = useQuery({
    queryKey: ["subscription-current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent(),
    enabled: Boolean(user && websiteId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!websiteId || !user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      let signature: string | undefined;
      try {
        const identity = await supportApi.getCrispIdentity();
        signature = identity.signature;
      } catch {
        /* signature optionnelle si vérification Crisp désactivée */
      }

      if (cancelled) return;

      const identity = buildCrispIdentity(user, activeOrganization?.name, subscription, signature);
      const sessionKey = [
        identity.tokenId,
        identity.email,
        identity.signature ?? "",
        identity.sessionData.organization_id,
        identity.sessionData.plan,
        identity.sessionData.subscription_status,
      ].join(":");

      if (boundSessionRef.current === sessionKey) {
        return;
      }

      bootCrispWithUser(websiteId, identity);
      boundSessionRef.current = sessionKey;
    })();

    return () => {
      cancelled = true;
    };
  }, [websiteId, user, activeOrganization?.name, subscription]);

  useEffect(() => {
    if (!websiteId) return;
    if (!user) {
      boundSessionRef.current = null;
      shutdownCrispSession();
    }
  }, [websiteId, user]);

  return null;
}
