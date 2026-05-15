"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { CreateUserPage } from "@/components/admin/CreateUserPage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewUserPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="users.invite">
        <AppShell>
          <CreateUserPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
