"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TeamsListPage } from "@/components/fleet/TeamsListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function TeamsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="teams.read">
        <AppShell>
          <TeamsListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
