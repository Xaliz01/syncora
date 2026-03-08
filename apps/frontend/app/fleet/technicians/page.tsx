"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { TechniciansListPage } from "@/components/fleet/TechniciansListPage";
import { AppShell } from "@/components/layout/AppShell";

export default function TechniciansPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <TechniciansListPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
