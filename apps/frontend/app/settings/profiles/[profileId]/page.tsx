import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { ProfileDetailsPage } from "@/components/admin/ProfileDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function SettingsProfileDetailsPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <ProfileDetailsPage profileId={profileId} />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
