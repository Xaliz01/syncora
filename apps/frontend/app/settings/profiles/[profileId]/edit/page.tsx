"use client";

import { use } from "react";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileFormPage } from "@/components/admin/ProfileCreatePage";

export default function EditProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="profiles.update">
        <AppShell>
          <Suspense fallback={<div className="p-6 text-sm text-slate-500">Chargement…</div>}>
            <ProfileFormPage profileId={profileId} />
          </Suspense>
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
