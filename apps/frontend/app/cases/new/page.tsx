"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CaseCreatePage } from "@/components/cases/CaseCreatePage";

export default function NewCasePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="cases.create">
        <AppShell>
          <CaseCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
