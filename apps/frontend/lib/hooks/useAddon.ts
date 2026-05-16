"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import type { AddonCode } from "@syncora/shared";
import * as subscriptionsApi from "@/lib/subscriptions.api";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { hasPermission } from "@/lib/auth-permissions";

export function useAddon(addonCode: AddonCode) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription-current"],
    queryFn: () => subscriptionsApi.getSubscriptionCurrent(),
  });

  const hasAddon = subscription?.activeAddons?.includes(addonCode) ?? false;
  const canManageBilling = hasPermission(user, "subscriptions.manage_billing");

  const checkoutMutation = useMutation({
    mutationFn: () => {
      const origin = window.location.origin;
      return subscriptionsApi.createAddonCheckoutSession({
        addonCode,
        successUrl: `${origin}/organization?checkout=success`,
        cancelUrl: `${origin}${window.location.pathname}?addon_checkout=canceled`,
      });
    },
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (err: Error) => {
      showToast(err.message ?? "Impossible d'ouvrir le paiement Stripe.");
    },
  });

  return {
    hasAddon,
    isLoading,
    canManageBilling,
    subscription,
    startCheckout: () => checkoutMutation.mutate(),
    isCheckoutPending: checkoutMutation.isPending,
  } as const;
}
