"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { SubscriptionPage } from "@/components/subscription/SubscriptionPage";

export default function SubscriptionRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <SubscriptionPage />
      </AppShell>
    </RequireAuth>
  );
}
