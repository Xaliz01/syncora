import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { TechnicianDetailsPage } from "@/components/fleet/TechnicianDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function TechnicianDetailsRoute({
  params,
}: {
  params: Promise<{ technicianId: string }>;
}) {
  const { technicianId } = await params;
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <TechnicianDetailsPage technicianId={technicianId} />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
