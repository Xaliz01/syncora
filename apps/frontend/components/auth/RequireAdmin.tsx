"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.replace("/");
    }
  }, [isReady, isAuthenticated, user, router]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 dark:text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return null;
  return <>{children}</>;
}
