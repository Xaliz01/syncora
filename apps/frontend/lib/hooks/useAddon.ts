"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  organizationHasAddon,
  organizationHasAddonViaTrialOnly,
  type AddonCode,
} from "@planwise/shared";
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

  const hasAddon = organizationHasAddon(subscription, addonCode);
  const includedViaTrial = organizationHasAddonViaTrialOnly(subscription, addonCode);
  const canManageBilling = hasPermission(user, "subscriptions.manage_billing");

  const openSubscriptionModify = () => {
    router.push(subscriptionModifyAddonsPath(addonCode));
  };

  return {
    hasAddon,
    includedViaTrial,
    isLoading,
    canManageBilling,
    subscription,
    openSubscriptionModify,
  } as const;
}
