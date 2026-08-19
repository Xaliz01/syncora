"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TeamFormPage } from "@/components/fleet/TeamCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewTeamPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="teams.create">
        <AppShell>
          <TeamFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
