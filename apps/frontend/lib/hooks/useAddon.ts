"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { AddonCode } from "@syncora/shared";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import { subscriptionModifyAddonsPath } from "@/lib/subscription-access";

export function useAddon(addonCode: AddonCode) {
  const router = useRouter();
  const { user } = useAuth();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription-current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent(),
  });

  const hasAddon = subscription?.activeAddons?.includes(addonCode) ?? false;
  const canManageBilling = hasPermission(user, "subscriptions.manage_billing");

  const openSubscriptionModify = () => {
    router.push(subscriptionModifyAddonsPath(addonCode));
  };

  return {
    hasAddon,
    isLoading,
    canManageBilling,
    subscription,
    openSubscriptionModify,
  } as const;
}
