"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerCreatePage } from "@/components/customers/CustomerCreatePage";

export default function NewCustomerPage() {
  return (
    <RequireAuth>
      <AppShell>
        <CustomerCreatePage />
      </AppShell>
    </RequireAuth>
  );
}
