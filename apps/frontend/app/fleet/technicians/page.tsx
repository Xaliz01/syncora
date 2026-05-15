"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TechniciansListPage } from "@/components/fleet/TechniciansListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function TechniciansPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.technicians.read">
        <AppShell>
          <TechniciansListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
