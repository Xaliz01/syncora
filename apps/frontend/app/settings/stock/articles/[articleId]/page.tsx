"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { ArticleDetailPage } from "@/components/stock/ArticleDetailPage";

export default function ArticleDetailRoute({ params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="stock.articles.read">
        <AppShell>
          <ArticleDetailPage articleId={articleId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
