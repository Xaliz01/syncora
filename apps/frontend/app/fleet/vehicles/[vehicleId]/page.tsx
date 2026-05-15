import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { VehicleDetailsPage } from "@/components/fleet/VehicleDetailsPage";
import { AppShell } from "@/components/layout/AppShell";

export default async function VehicleDetailsRoute({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  return (
    <RequireAuth>
      <RequireAdmin>
        <AppShell>
          <VehicleDetailsPage vehicleId={vehicleId} />
        </AppShell>
      </RequireAdmin>
    </RequireAuth>
  );
}
