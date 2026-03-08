"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { VehicleCreatePage } from "@/components/fleet/VehicleCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewVehiclePage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <VehicleCreatePage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
