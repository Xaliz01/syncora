"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";

export default function IntegrationsRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <RequirePermission permission="integrations.pennylane.read">
          <IntegrationsPage />
        </RequirePermission>
      </AppShell>
    </RequireAuth>
  );
}
