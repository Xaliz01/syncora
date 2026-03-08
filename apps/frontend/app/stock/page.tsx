"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { StockArticlesPage } from "@/components/stock/StockArticlesPage";

export default function StockPage() {
  return (
    <RequireAuth>
      <AppShell>
        <StockArticlesPage mode="movements" />
      </AppShell>
    </RequireAuth>
  );
}
