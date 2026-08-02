"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { ReportResultPage } from "@/components/reporting/ReportResultPage";

export default function ReportResultRoute() {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <ReportResultPage />
        </Suspense>
      </AppShell>
    </RequireAuth>
  );
}
