"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { TemplatesListPage } from "@/components/cases/TemplatesListPage";

export default function CaseTemplatesPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="case_templates.read">
        <AppShell>
          <TemplatesListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
