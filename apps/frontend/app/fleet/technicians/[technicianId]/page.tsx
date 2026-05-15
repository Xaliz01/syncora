"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TechnicianDetailsPage } from "@/components/fleet/TechnicianDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function TechnicianDetailsRoute({
  params,
}: {
  params: Promise<{ technicianId: string }>;
}) {
  const { technicianId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="fleet.technicians.read">
        <AppShell>
          <TechnicianDetailsPage technicianId={technicianId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
