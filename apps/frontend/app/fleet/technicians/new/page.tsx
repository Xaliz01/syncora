"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TechnicianCreatePage } from "@/components/fleet/TechnicianCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewTechnicianPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.technicians.create">
        <AppShell>
          <TechnicianCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
