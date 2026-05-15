"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { StockArticlesPage } from "@/components/stock/StockArticlesPage";

export default function StockPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="stock.movements.read">
        <AppShell>
          <StockArticlesPage mode="movements" />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
