import { Suspense } from "react";
import { PlatformUsersPage } from "@/components/platform/PlatformUsersPage";

export default function PlatformUsersRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
      <PlatformUsersPage />
    </Suspense>
  );
}
