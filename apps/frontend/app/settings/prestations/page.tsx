"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { PrestationsPage } from "@/components/prestations/PrestationsPage";

export default function PrestationsSettingsPage() {
  return (
    <RequireAuth>
      <RequirePermission permission="prestations.read">
        <AppShell>
          <Suspense fallback={<div className="p-6 text-sm text-slate-500">Chargement…</div>}>
            <PrestationsPage />
          </Suspense>
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
