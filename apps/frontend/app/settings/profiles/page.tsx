"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { ProfilesSettingsPage } from "@/components/admin/ProfilesSettingsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsProfilesPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <ProfilesSettingsPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
