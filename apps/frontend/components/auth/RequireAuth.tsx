"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import {
  hasActiveSubscriptionAccess,
  isOrganizationSubscriptionRoute
} from "@/lib/subscription-access";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  React.useEffect(() => {
    if (!isReady || !isAuthenticated || !user) return;
    if (hasActiveSubscriptionAccess(user)) return;
    if (isOrganizationSubscriptionRoute(pathname)) return;
    router.replace("/organization");
  }, [isReady, isAuthenticated, user, pathname, router]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 dark:text-slate-500">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
