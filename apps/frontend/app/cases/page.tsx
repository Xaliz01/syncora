"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CasesListPage } from "@/components/cases/CasesListPage";

export default function CasesPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="cases.read">
        <AppShell>
          <CasesListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
