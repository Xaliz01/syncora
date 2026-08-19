"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { AgenceFormPage } from "@/components/fleet/AgenceCreatePage";

export default function AgenceEditRoute({ params }: { params: Promise<{ agenceId: string }> }) {
  const { agenceId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="agences.update">
        <AppShell>
          <AgenceFormPage agenceId={agenceId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
