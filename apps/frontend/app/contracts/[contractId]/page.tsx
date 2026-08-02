"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { MaintenanceContractDetailPage } from "@/components/contracts/MaintenanceContractDetailPage";

export default function ContractDetailRoute({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="contracts.read">
        <AppShell>
          <MaintenanceContractDetailPage contractId={contractId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
