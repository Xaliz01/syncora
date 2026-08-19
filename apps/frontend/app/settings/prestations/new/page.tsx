"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { PrestationFormPage } from "@/components/prestations/PrestationFormPage";

export default function NewPrestationPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="prestations.create">
        <AppShell>
          <PrestationFormPage />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
