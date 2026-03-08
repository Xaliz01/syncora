"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarPage } from "@/components/dossiers/CalendarPage";

export default function CalendarRoute() {
  return (
    <RequireAuth>
      <AppShell>
        <CalendarPage />
      </AppShell>
    </RequireAuth>
  );
}
