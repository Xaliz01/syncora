"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarPage } from "@/components/cases/CalendarPage";

export default function CalendarRoute() {
  return (
    <RequireAuth>
      <RequirePermission permission="cases.read">
        <AppShell>
          <CalendarPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
