"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { UsersManagementPage } from "@/components/admin/UsersManagementPage";
import { AppShell } from "@/components/layout/AppShell";

export default function UsersPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="users.read">
        <AppShell>
          <UsersManagementPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
