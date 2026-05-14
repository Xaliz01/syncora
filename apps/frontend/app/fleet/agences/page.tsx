"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AgencesListPage } from "@/components/fleet/AgencesListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function AgencesPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="agences.read">
        <AppShell>
          <AgencesListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
