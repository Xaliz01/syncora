"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { ProfilesSettingsPage } from "@/components/admin/ProfilesSettingsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsProfilesPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="profiles.read">
        <AppShell>
          <ProfilesSettingsPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
