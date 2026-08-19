"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { OrderGiverEditPage } from "@/components/order-givers/OrderGiverEditPage";

export default function EditOrderGiverRoute({
  params,
}: {
  params: Promise<{ orderGiverId: string }>;
}) {
  const { orderGiverId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="order_givers.update">
        <AppShell>
          <OrderGiverEditPage orderGiverId={orderGiverId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
