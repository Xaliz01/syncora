"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { TechnicianCreatePage } from "@/components/fleet/TechnicianCreatePage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewTechnicianPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <TechnicianCreatePage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
