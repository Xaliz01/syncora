"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TeamCreatePage } from "@/components/fleet/TeamCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewTeamPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="teams.create">
        <AppShell>
          <TeamCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
