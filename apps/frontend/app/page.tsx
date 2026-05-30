"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { HomePage } from "@/components/HomePage";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/components/landing/LandingPage";
import { useAuth } from "@/components/auth/AuthContext";

export default function Home() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
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
