"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { TeamsListPage } from "@/components/fleet/TeamsListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function TeamsPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <TeamsListPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
