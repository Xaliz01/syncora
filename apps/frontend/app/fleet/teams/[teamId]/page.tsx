"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { TeamDetailsPage } from "@/components/fleet/TeamDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function TeamDetailsRoute({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="teams.read">
        <AppShell>
          <TeamDetailsPage teamId={teamId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
