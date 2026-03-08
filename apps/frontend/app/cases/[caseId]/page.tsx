"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CaseDetailPage } from "@/components/cases/CaseDetailPage";

export default function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  return (
    <RequireAuth>
      <AppShell>
        <CaseDetailPage caseId={caseId} />
      </AppShell>
    </RequireAuth>
  );
}
