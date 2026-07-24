"use client";

import { Suspense, use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CaseDetailPage } from "@/components/cases/CaseDetailPage";

function CaseDetail({ caseId }: { caseId: string }) {
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

export default function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = use(params);
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Chargement…</div>}>
      <CaseDetail caseId={caseId} />
    </Suspense>
  );
}
