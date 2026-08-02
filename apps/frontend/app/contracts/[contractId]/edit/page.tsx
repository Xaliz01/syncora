"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { MaintenanceContractFormPage } from "@/components/contracts/MaintenanceContractFormPage";

export default function ContractEditRoute({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="contracts.update">
        <AppShell>
          <MaintenanceContractFormPage mode="edit" contractId={contractId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
