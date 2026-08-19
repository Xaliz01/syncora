"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { ArticleFormPage } from "@/components/stock/ArticleCreatePage";

export default function EditArticlePage({ params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="stock.articles.update">
        <AppShell>
          <ArticleFormPage articleId={articleId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
