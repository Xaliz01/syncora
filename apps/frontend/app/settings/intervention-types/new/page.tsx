"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { InterventionTypeFormPage } from "@/components/cases/InterventionTypeFormPage";

export default function NewInterventionTypePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="intervention_types.create">
        <AppShell>
          <InterventionTypeFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
