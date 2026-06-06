"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { MyDayPage } from "@/components/my-day/MyDayPage";

export default function MyDayRoute() {
  return (
    <RequireAuth>
      <RequirePermission permission="interventions.read">
        <AppShell>
          <MyDayPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
