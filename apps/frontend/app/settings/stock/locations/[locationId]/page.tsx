"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { StockLocationDetailPage } from "@/components/stock/StockLocationDetailPage";

export default function StockLocationDetailRoute({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="stock.locations.read">
        <AppShell>
          <StockLocationDetailPage locationId={locationId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
