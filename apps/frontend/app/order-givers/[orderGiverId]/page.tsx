"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { OrderGiverDetailPage } from "@/components/order-givers/OrderGiverDetailPage";

export default function OrderGiverPage({ params }: { params: Promise<{ orderGiverId: string }> }) {
  const { orderGiverId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="order_givers.read">
        <AppShell>
          <OrderGiverDetailPage orderGiverId={orderGiverId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
