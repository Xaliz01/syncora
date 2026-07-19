"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";

export default function IntegrationsRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <RequirePermission anyOf={["integrations.pennylane.read", "integrations.qonto.read"]}>
          <IntegrationsPage />
        </RequirePermission>
      </AppShell>
    </RequireAuth>
  );
}
