"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { TemplatesListPage } from "@/components/cases/TemplatesListPage";

export default function CaseTemplatesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <TemplatesListPage />
      </AppShell>
    </RequireAuth>
  );
}
