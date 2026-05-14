"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
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
      <RequirePermission permission="case_templates.read">
        <AppShell>
          <TemplateFormPage templateId={templateId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
