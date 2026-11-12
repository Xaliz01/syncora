"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CopilotHistoryPage } from "@/components/copilot/CopilotHistoryPage";

export default function CopilotRoute() {
  return (
    <RequireAuth>
      <RequirePermission permission="ai.copilot">
        <AppShell>
          <CopilotHistoryPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
