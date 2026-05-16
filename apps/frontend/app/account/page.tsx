"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { AccountPage } from "@/components/account/AccountPage";

export default function AccountRoutePage() {
  return (
    <RequireAuth>
      <AppShell>
        <AccountPage />
      </AppShell>
    </RequireAuth>
  );
}
