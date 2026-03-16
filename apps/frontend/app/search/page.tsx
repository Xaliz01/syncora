"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { SearchResultsPage } from "@/components/SearchResultsPage";

function SearchContent() {
  return (
    <RequireAuth>
      <AppShell>
        <SearchResultsPage />
      </AppShell>
    </RequireAuth>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
