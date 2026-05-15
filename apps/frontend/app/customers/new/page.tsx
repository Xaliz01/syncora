"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerCreatePage } from "@/components/customers/CustomerCreatePage";

export default function NewCustomerPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="customers.create">
        <AppShell>
          <CustomerCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
