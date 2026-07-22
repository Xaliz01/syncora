"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { RequireBillingIntegration } from "@/components/billing/RequireBillingIntegration";
import { AppShell } from "@/components/layout/AppShell";
import { BillingFollowUpPage } from "@/components/billing/BillingFollowUpPage";

export default function BillingRoute() {
  return (
    <RequireAuth>
      <RequirePermission permission="exports.billing">
        <AppShell>
          <RequireBillingIntegration>
            <BillingFollowUpPage />
          </RequireBillingIntegration>
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
