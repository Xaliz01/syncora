"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { VehicleFormPage } from "@/components/fleet/VehicleCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewVehiclePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.vehicles.create">
        <AppShell>
          <VehicleFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
