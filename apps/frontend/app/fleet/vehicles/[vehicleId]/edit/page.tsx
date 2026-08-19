"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { VehicleFormPage } from "@/components/fleet/VehicleCreatePage";

export default function VehicleEditRoute({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.vehicles.update">
        <AppShell>
          <VehicleFormPage vehicleId={vehicleId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
