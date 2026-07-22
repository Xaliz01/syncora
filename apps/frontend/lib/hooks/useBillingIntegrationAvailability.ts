"use client";

import { useQuery } from "@tanstack/react-query";
import type { BillingIntegrationAvailability } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { hasAnyPermission } from "@/lib/auth-permissions";
import * as integrationsApi from "@/lib/integrations.api";

/** True si Pennylane ou Qonto est connecté (pour nav / page Facturation). */
export function useBillingIntegrationAvailability() {
  const { user } = useAuth();
  const canCheck = hasAnyPermission(user, [
    "exports.billing",
    "exports.reporting",
    "integrations.pennylane.read",
    "integrations.qonto.read",
  ]);

  return useQuery<BillingIntegrationAvailability>({
    queryKey: ["billing-integration-availability", user?.organizationId],
    queryFn: () => integrationsApi.getBillingIntegrationAvailability(),
    enabled: Boolean(user && canCheck),
    staleTime: 60_000,
  });
}
