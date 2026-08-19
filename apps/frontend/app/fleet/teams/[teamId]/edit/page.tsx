"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { TeamFormPage } from "@/components/fleet/TeamCreatePage";

export default function TeamEditRoute({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="teams.update">
        <AppShell>
          <TeamFormPage teamId={teamId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
