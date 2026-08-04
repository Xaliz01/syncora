"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { OrderGiverCreatePage } from "@/components/order-givers/OrderGiverCreatePage";

export default function NewOrderGiverPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="order_givers.create">
        <AppShell>
          <OrderGiverCreatePage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
