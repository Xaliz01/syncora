"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { MaintenanceContractFormPage } from "@/components/contracts/MaintenanceContractFormPage";

function NewContractInner() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") ?? undefined;
  return <MaintenanceContractFormPage mode="create" initialCustomerId={customerId} />;
}

export default function NewContractPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="contracts.create">
        <AppShell>
          <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
            <NewContractInner />
          </Suspense>
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
