"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { BillingFollowUpPage } from "@/components/billing/BillingFollowUpPage";

export default function BillingRoute() {
  return (
    <RequireAuth>
      <RequirePermission anyOf={["billing.invoices.read", "exports.billing"]}>
        <AppShell>
          <BillingFollowUpPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
