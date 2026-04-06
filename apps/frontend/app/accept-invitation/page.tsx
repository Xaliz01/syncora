import { Suspense } from "react";
import { AcceptInvitationPage } from "@/components/auth/AcceptInvitationPage";

export default function AcceptInvitation() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 dark:text-slate-500">
          Chargement…
        </div>
      }
    >
      <AcceptInvitationPage />
    </Suspense>
  );
}
