"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { PermissionsSettingsPage } from "@/components/admin/PermissionsSettingsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPermissionsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="profiles.read">
        <AppShell>
          <PermissionsSettingsPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
