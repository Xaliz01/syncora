"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { PermissionsSettingsPage } from "@/components/admin/PermissionsSettingsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPermissionsPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <PermissionsSettingsPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
