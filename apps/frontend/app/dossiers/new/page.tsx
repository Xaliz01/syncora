"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DossierCreatePage } from "@/components/dossiers/DossierCreatePage";

export default function NewDossierPage() {
  return (
    <RequireAuth>
      <AppShell>
        <DossierCreatePage />
      </AppShell>
    </RequireAuth>
  );
}
