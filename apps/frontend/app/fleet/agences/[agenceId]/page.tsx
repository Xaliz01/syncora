import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { AgenceDetailsPage } from "@/components/fleet/AgenceDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function AgenceDetailsRoute({
  params
}: {
  params: Promise<{ agenceId: string }>;
}) {
  const { agenceId } = await params;
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <AgenceDetailsPage agenceId={agenceId} />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
