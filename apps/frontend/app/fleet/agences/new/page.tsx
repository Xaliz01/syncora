"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AgenceCreatePage } from "@/components/fleet/AgenceCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewAgencePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="agences.create">
        <AppShell>
          <AgenceCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
