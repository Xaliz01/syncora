"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { DataImportSettingsPage } from "@/components/settings/DataImportSettingsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function DataImportPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="data_import.read">
        <AppShell>
          <DataImportSettingsPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
