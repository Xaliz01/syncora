"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { VehiclesListPage } from "@/components/fleet/VehiclesListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function VehiclesPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.vehicles.read">
        <AppShell>
          <VehiclesListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
