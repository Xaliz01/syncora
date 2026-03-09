"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AgenceCreatePage } from "@/components/fleet/AgenceCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewAgencePage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <AgenceCreatePage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
