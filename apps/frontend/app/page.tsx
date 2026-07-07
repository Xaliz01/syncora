"use client";

import { useEffect } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { HomePage } from "@/components/HomePage";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthContext";
import { getAppOrigin, isMarketingHost } from "@/lib/host-routing";
import { postAuthHomePath } from "@/lib/subscription-access";

export default function Home() {
  const { isAuthenticated, isReady, user } = useAuth();

  const onMarketingHost =
    typeof window !== "undefined" && isMarketingHost(window.location.hostname);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user || !onMarketingHost) return;
    window.location.assign(`${getAppOrigin()}${postAuthHomePath(user)}`);
  }, [isReady, isAuthenticated, user, onMarketingHost]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (onMarketingHost || !isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <RequireAuth>
      <AppShell>
        <HomePage />
      </AppShell>
    </RequireAuth>
  );
}
