import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { UserDetailsPage } from "@/components/admin/UserDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function UserDetailsRoute({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <UserDetailsPage userId={userId} />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
