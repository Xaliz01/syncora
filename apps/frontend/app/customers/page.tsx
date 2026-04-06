"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CustomersListPage } from "@/components/customers/CustomersListPage";

export default function CustomersPage() {
  return (
    <RequireAuth>
      <AppShell>
        <CustomersListPage />
      </AppShell>
    </RequireAuth>
  );
}
