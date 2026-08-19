"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { PrestationFormPage } from "@/components/prestations/PrestationFormPage";

export default function EditPrestationPage({
  params,
}: {
  params: Promise<{ prestationId: string }>;
}) {
  const { prestationId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="prestations.update">
        <AppShell>
          <PrestationFormPage prestationId={prestationId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
