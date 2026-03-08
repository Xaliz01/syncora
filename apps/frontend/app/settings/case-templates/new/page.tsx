"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateFormPage } from "@/components/cases/TemplateFormPage";

export default function NewCaseTemplatePage() {
  return (
    <RequireAuth>
      <AppShell>
        <TemplateFormPage />
      </AppShell>
    </RequireAuth>
  );
}
