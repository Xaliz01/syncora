"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { OrganizationPage } from "@/components/organization/OrganizationPage";

export default function OrganizationRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <OrganizationPage />
      </AppShell>
    </RequireAuth>
  );
}
