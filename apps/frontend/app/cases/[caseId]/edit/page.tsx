"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CaseEditPage } from "@/components/cases/CaseEditPage";

export default function EditCaseRoute({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="cases.update">
        <AppShell>
          <CaseEditPage caseId={caseId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
