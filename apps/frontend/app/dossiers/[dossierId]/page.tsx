"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { DossierDetailPage } from "@/components/dossiers/DossierDetailPage";

export default function DossierPage({ params }: { params: Promise<{ dossierId: string }> }) {
  const { dossierId } = use(params);
  return (
    <RequireAuth>
      <AppShell>
        <DossierDetailPage dossierId={dossierId} />
      </AppShell>
    </RequireAuth>
  );
}
