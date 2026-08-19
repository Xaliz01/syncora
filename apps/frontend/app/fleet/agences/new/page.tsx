"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AgenceFormPage } from "@/components/fleet/AgenceCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewAgencePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="agences.create">
        <AppShell>
          <AgenceFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
