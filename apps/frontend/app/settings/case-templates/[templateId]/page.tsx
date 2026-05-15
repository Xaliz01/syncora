"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { TemplateFormPage } from "@/components/cases/TemplateFormPage";

export default function EditCaseTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  return (
    <RequireAuth>
      <AppShell>
        <TemplateFormPage templateId={templateId} />
      </AppShell>
    </RequireAuth>
  );
}
