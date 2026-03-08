"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateFormPage } from "@/components/dossiers/TemplateFormPage";

export default function NewTemplatePage() {
  return (
    <RequireAuth>
      <AppShell>
        <TemplateFormPage />
      </AppShell>
    </RequireAuth>
  );
}
