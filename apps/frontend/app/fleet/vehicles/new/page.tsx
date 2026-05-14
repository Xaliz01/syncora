"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { VehicleCreatePage } from "@/components/fleet/VehicleCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewVehiclePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.vehicles.create">
        <AppShell>
          <VehicleCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
