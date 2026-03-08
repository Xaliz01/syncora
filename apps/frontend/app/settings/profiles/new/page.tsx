"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { ProfileCreatePage } from "@/components/admin/ProfileCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsProfileCreatePage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <ProfileCreatePage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
