"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { VehiclesListPage } from "@/components/fleet/VehiclesListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function VehiclesPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <VehiclesListPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
