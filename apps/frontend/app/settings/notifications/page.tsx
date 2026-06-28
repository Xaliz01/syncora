"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationPreferencesPage } from "@/components/notifications/NotificationPreferencesPage";

export default function NotificationSettingsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <NotificationPreferencesPage />
      </AppShell>
    </RequireAuth>
  );
}
