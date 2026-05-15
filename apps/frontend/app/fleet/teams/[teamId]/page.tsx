import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { TeamDetailsPage } from "@/components/fleet/TeamDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function TeamDetailsRoute({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <TeamDetailsPage teamId={teamId} />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
