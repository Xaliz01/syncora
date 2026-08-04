"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { OrderGiversListPage } from "@/components/order-givers/OrderGiversListPage";

export default function OrderGiversPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="order_givers.read">
        <AppShell>
          <OrderGiversListPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
