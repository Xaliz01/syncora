"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationPreferencesPage } from "@/components/notifications/NotificationPreferencesPage";

export default function NotificationSettingsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <RequirePermission permission="notifications.manage_preferences">
          <NotificationPreferencesPage />
        </RequirePermission>
      </AppShell>
    </RequireAuth>
  );
}
