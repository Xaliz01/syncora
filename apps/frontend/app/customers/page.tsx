"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CustomersListPage } from "@/components/customers/CustomersListPage";

export default function CustomersPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="customers.read">
        <AppShell>
          <CustomersListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
