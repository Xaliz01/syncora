"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CasesListPage } from "@/components/cases/CasesListPage";

export default function CasesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <CasesListPage />
      </AppShell>
    </RequireAuth>
  );
}
