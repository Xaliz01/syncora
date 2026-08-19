"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { InterventionTypeFormPage } from "@/components/cases/InterventionTypeFormPage";

export default function EditInterventionTypePage({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="intervention_types.update">
        <AppShell>
          <InterventionTypeFormPage typeId={typeId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
