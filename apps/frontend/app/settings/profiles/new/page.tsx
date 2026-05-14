"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { ProfileCreatePage } from "@/components/admin/ProfileCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsProfileCreatePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="profiles.create">
        <AppShell>
          <ProfileCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
