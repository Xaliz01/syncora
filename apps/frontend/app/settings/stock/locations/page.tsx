"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { StockLocationsPage } from "@/components/stock/StockLocationsPage";

export default function StockLocationsSettingsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="stock.locations.read">
        <AppShell>
          <StockLocationsPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
