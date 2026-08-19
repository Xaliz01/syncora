"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerEditPage } from "@/components/customers/CustomerEditPage";

export default function EditCustomerRoute({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="customers.update">
        <AppShell>
          <CustomerEditPage customerId={customerId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
