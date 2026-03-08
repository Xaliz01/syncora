"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { CreateUserPage } from "@/components/admin/CreateUserPage";
import { AppShell } from "@/components/layout/AppShell";

export default function NewUserPage() {
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <CreateUserPage />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
