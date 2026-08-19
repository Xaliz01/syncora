"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { ArticleFormPage } from "@/components/stock/ArticleCreatePage";

export default function NewArticlePage() {
  return (
    <RequireAuth>
      <RequirePermission permission="stock.articles.create">
        <AppShell>
          <ArticleFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
