"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { ReportingPage } from "@/components/reporting/ReportingPage";

export default function ReportingRoute() {
  return (
    <RequireAuth>
      <RequirePermission permission="exports.reporting">
        <AppShell>
          <ReportingPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
