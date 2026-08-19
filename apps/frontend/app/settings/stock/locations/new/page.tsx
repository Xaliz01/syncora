"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { StockLocationFormPage } from "@/components/stock/StockLocationCreatePage";

export default function NewStockLocationPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="stock.locations.create">
        <AppShell>
          <StockLocationFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
