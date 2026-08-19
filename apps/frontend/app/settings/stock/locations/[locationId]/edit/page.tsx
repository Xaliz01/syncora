"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { StockLocationFormPage } from "@/components/stock/StockLocationCreatePage";

export default function EditStockLocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="stock.locations.update">
        <AppShell>
          <StockLocationFormPage locationId={locationId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
