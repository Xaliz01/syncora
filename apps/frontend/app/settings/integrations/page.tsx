"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { IntegrationsPage } from "@/components/integrations/IntegrationsPage";

/** Ancienne URL : redirige vers Facturation. */
export default function IntegrationsRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <IntegrationsPage />
      </AppShell>
    </RequireAuth>
  );
}
