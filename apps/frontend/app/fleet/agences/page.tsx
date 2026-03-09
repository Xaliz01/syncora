"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AgencesListPage } from "@/components/fleet/AgencesListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function AgencesPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <AgencesListPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
