"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { UserDetailsPage } from "@/components/admin/UserDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default function UserDetailsRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return (
    <RequireAuth>
      <RequirePermission permission="users.read">
        <AppShell>
          <UserDetailsPage userId={userId} />
        </AppShell>
      </RequirePermission>
    </RequireAuth>
  );
}
