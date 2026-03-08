"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { UsersManagementPage } from "@/components/admin/UsersManagementPage";
import { AppShell } from "@/components/layout/AppShell";

export default function UsersPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <UsersManagementPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
