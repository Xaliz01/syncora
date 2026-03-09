"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { TeamCreatePage } from "@/components/fleet/TeamCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewTeamPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <TeamCreatePage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
