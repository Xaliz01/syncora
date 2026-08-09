"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { InterventionTypesSettingsPage } from "@/components/cases/InterventionTypesSettingsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function InterventionTypesPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="intervention_types.read">
        <AppShell>
          <InterventionTypesSettingsPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
