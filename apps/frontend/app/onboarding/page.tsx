"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { OnboardingProfilePage } from "@/components/onboarding/OnboardingProfilePage";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export default function OnboardingRoute() {
  return (
    <RequireAuth>
      <Suspense fallback={<PageLoadingFallback />}>
        <OnboardingProfilePage />
      </Suspense>
    </RequireAuth>
  );
}
