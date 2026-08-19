"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TechnicianFormPage } from "@/components/fleet/TechnicianCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewTechnicianPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.technicians.create">
        <AppShell>
          <TechnicianFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
