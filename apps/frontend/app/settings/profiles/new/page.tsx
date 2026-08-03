"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { ProfileCreatePage } from "@/components/admin/ProfileCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsProfileCreatePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="profiles.create">
        <AppShell>
          <Suspense
            fallback={
              <div className="text-sm text-slate-500 dark:text-slate-400">Chargement...</div>
            }
          >
            <ProfileCreatePage />
          </Suspense>
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
