"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateFormPage } from "@/components/cases/TemplateFormPage";

export default function NewCaseTemplatePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="case_templates.create">
        <AppShell>
          <TemplateFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
