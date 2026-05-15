"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AgenceDetailsPage } from "@/components/fleet/AgenceDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function AgenceDetailsRoute({ params }: { params: Promise<{ agenceId: string }> }) {
  const { agenceId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="agences.read">
        <AppShell>
          <AgenceDetailsPage agenceId={agenceId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
