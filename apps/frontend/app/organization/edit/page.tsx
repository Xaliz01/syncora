"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { OrganizationEditPage } from "@/components/organization/OrganizationEditPage";

export default function OrganizationEditRoutePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="organizations.update" redirectTo="/organization">
        <AppShell>
          <OrganizationEditPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
