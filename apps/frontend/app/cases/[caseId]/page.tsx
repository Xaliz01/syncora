"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CaseDetailPage } from "@/components/cases/CaseDetailPage";

export default function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="cases.read">
        <AppShell>
          <CaseDetailPage caseId={caseId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
