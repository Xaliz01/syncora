"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CaseCreatePage } from "@/components/cases/CaseCreatePage";

export default function NewCasePage() {
  return (
    <RequireAuth>
      <AppShell>
        <CaseCreatePage />
      </AppShell>
    </RequireAuth>
  );
}
