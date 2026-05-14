"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { StockArticlesPage } from "@/components/stock/StockArticlesPage";

export default function StockArticlesSettingsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="stock.articles.read">
        <AppShell>
          <StockArticlesPage mode="catalog" />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
