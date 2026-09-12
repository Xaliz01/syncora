"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { AccountEditPage } from "@/components/account/AccountEditPage";

export default function AccountEditRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <AccountEditPage />
      </AppShell>
    </RequireAuth>
  );
}
