"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DossiersListPage } from "@/components/dossiers/DossiersListPage";

export default function DossiersPage() {
  return (
    <RequireAuth>
      <AppShell>
        <DossiersListPage />
      </AppShell>
    </RequireAuth>
  );
}
