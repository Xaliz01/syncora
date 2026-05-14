"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { VehicleDetailsPage } from "@/components/fleet/VehicleDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function VehicleDetailsRoute({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.vehicles.read">
        <AppShell>
          <VehicleDetailsPage vehicleId={vehicleId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
