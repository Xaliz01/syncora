"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { PrestationsPage } from "@/components/prestations/PrestationsPage";

export default function PrestationsSettingsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="prestations.read">
        <AppShell>
          <PrestationsPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
