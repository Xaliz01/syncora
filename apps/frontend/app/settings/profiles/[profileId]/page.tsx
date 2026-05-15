"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { ProfileDetailsPage } from "@/components/admin/ProfileDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsProfileDetailsPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="profiles.read">
        <AppShell>
          <ProfileDetailsPage profileId={profileId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
