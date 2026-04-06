"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { CustomerDetailPage } from "@/components/customers/CustomerDetailPage";

export default function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = use(params);
  return (
    <RequireAuth>
      <AppShell>
        <CustomerDetailPage customerId={customerId} />
      </AppShell>
    </RequireAuth>
  );
}
