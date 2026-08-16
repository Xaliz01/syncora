import { Suspense } from "react";
import { AcceptInvitationPage } from "@/components/auth/AcceptInvitationPage";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export default function AcceptInvitation() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <AcceptInvitationPage />
    </Suspense>
  );
}
