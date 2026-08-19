"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { TechnicianFormPage } from "@/components/fleet/TechnicianCreatePage";

export default function TechnicianEditRoute({
  params,
}: {
  params: Promise<{ technicianId: string }>;
}) {
  const { technicianId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.technicians.update">
        <AppShell>
          <TechnicianFormPage technicianId={technicianId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
