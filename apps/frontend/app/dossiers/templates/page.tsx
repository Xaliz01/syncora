"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { TemplatesListPage } from "@/components/dossiers/TemplatesListPage";

export default function TemplatesPage() {
  return (
    <RequireAuth>
      <AppShell>
        <TemplatesListPage />
      </AppShell>
    </RequireAuth>
  );
}
