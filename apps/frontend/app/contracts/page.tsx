"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { MaintenanceContractsListPage } from "@/components/contracts/MaintenanceContractsListPage";

export default function ContractsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="contracts.read">
        <AppShell>
          <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
            <MaintenanceContractsListPage />
          </Suspense>
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
