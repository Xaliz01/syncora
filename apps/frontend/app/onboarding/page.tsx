"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { OnboardingProfilePage } from "@/components/onboarding/OnboardingProfilePage";

export default function OnboardingRoute() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
            Chargement…
          </div>
        }
      >
        <OnboardingProfilePage />
      </Suspense>
    </RequireAuth>
  );
}
